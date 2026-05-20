# Deployment Proposal — BandLab Studio
## Short-Term Free Hosting + Supabase Storage Migration + GitHub CI/CD

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│  GitHub (source of truth)                                        │
│  └─ push to main ──────────────────────────────────────────────┐│
│       │                           ││                            ││
│       ▼                           ▼▼                            ││
│  Vercel (frontend)          Railway (backend)                   ││
│  React + Vite SPA           Express + Socket.io                 ││
│  https://bandlab.vercel.app  https://api.railway.app            ││
│       │                           │                             ││
│       └───────── REST / WS ───────┘                             ││
│                                   │                              ││
│                       ┌───────────┼──────────────┐              ││
│                       ▼           ▼              ▼              ││
│                 MongoDB Atlas  Supabase       Supabase           │
│                 M0 (free)      Storage        Auth (optional)    │
│                 metadata +     audio files                       │
│                 chat/comments  (1 GB free)                       │
└──────────────────────────────────────────────────────────────────┘
```

**Monthly cost: $0** (within free-tier limits)

| Service | Role | Free Limit |
|---|---|---|
| Vercel (Hobby) | React/Vite SPA hosting | Unlimited deployments |
| Railway (Starter) | Express + Socket.io server | $5 credit/month (~500 hrs) |
| MongoDB Atlas M0 | Track/comment/chat/user metadata | 512 MB (safe — no audio blobs) |
| Supabase (Free) | Audio file storage | 1 GB storage, 2 GB egress/month |
| GitHub Actions | CI/CD pipeline | 2,000 min/month |

---

## Part 1 — Supabase Storage Migration (GridFS → Supabase)

### Why this is necessary

Audio files stored in MongoDB GridFS count toward Atlas M0's 512 MB cap. A single recording session can produce files 20–100 MB each. Migrating to Supabase Storage removes audio blobs from MongoDB entirely, leaving Atlas M0 free for lightweight metadata (tracks, comments, chat, users).

### Design

Audio uploads continue to flow through the Express backend (JWT is verified there before any write happens). The backend uses the Supabase **service role key** to write to storage. Files are stored at the path `audio/{userId}/{trackId}.webm` in a public bucket. The backend returns the public Supabase URL, which replaces the GridFS ObjectId in `Track.audioFileId`.

```
Browser  →  POST /api/audio/upload/:trackId (JWT)  →  Express
                                                         │
                                               Supabase Storage SDK
                                               (service role key)
                                                         │
                                               bucket: audio
                                               path: audio/{userId}/{trackId}.webm
                                                         │
                                               ← returns public URL
Express  →  { audioPath: "https://xxxx.supabase.co/..." }  →  Browser
```

### 1.1 — Create the Supabase Storage bucket

In your Supabase project dashboard:

1. Go to **Storage → New bucket**
2. Name: `audio`
3. Toggle **Public bucket** ON (so audio streams without token)
4. Click **Create bucket**
5. Under **Policies**, add the following RLS policy to allow public reads and authenticated uploads:

```sql
-- Allow anyone to read (stream audio in browser)
CREATE POLICY "Public audio read"
ON storage.objects FOR SELECT
USING (bucket_id = 'audio');

-- Allow authenticated inserts from service role only (enforced at app level)
-- No additional policy needed — service role bypasses RLS
```

### 1.2 — Backend: add Supabase SDK

```bash
cd server && npm install @supabase/supabase-js
```

Add to `server/.env` (and `server/.env.example`):

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key   # Project Settings → API → service_role
```

> **Security**: The service role key bypasses RLS. It must NEVER be exposed to the browser. Keep it in `server/.env` only.

### 1.3 — Replace `server/routes/audio.js`

**Current:** multer → in-memory buffer → GridFS write stream  
**New:** multer → in-memory buffer → Supabase Storage `uploadBytes`

```js
// server/routes/audio.js  (full replacement)
import express from 'express';
import multer, { memoryStorage } from 'multer';
import { createClient } from '@supabase/supabase-js';
import verifyJWT from '../middleware/auth.js';

const router = express.Router();
const upload = multer({ storage: new memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const BUCKET = 'audio';

// POST /api/audio/upload/:trackId
router.post('/upload/:trackId', verifyJWT, upload.single('audio'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No audio file provided' });
  try {
    const { buffer, mimetype } = req.file;
    const ext = mimetype === 'audio/webm' ? 'webm' : 'mp4';
    const storagePath = `${req.user.userId}/${req.params.trackId}.${ext}`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        contentType: mimetype || 'audio/webm',
        upsert: true,  // overwrite on re-record
      });

    if (error) throw error;

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
    res.json({ audioPath: data.publicUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/audio — path passed as query param to avoid encoding issues
router.delete('/', verifyJWT, async (req, res) => {
  try {
    const { storagePath } = req.body;
    if (!storagePath) return res.status(400).json({ error: 'storagePath required' });
    const { error } = await supabase.storage.from(BUCKET).remove([storagePath]);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
```

> **Note**: The `GET /api/audio/:fileId` streaming route is intentionally removed. Audio files are now served directly from Supabase's CDN — the browser uses the public URL returned by the upload endpoint as `<audio src>`, bypassing Express entirely. The `app.use('/api/audio', audioRouter)` registration in `server/index.js` remains; it just no longer has a GET handler.

### 1.4 — Update `server/db.js`

Remove GridFSBucket — it is no longer used:

```js
// server/db.js  (simplified)
import mongoose from 'mongoose';

export default async function connectDB() {
  const conn = await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB connected:', conn.connection.host);
}
```

### 1.5 — Update `src/lib/api.js` (frontend)

`apiGetAudioUrl` currently wraps a GridFS ObjectId in an Express URL. After migration, `audioPath` is already a full Supabase public URL — return it as-is. Update the delete call to match the new endpoint shape:

```js
// apiGetAudioUrl — audioPath is now a full URL
export function apiGetAudioUrl(audioPath) {
  return audioPath;  // already a full Supabase public URL
}

// apiDeleteAudio — send storagePath extracted from the full URL
export async function apiDeleteAudio(audioPath) {
  // Extract the storage path from the full URL:
  // "https://xxx.supabase.co/storage/v1/object/public/audio/userId/trackId.webm"
  // → "userId/trackId.webm"
  const url = new URL(audioPath);
  const storagePath = url.pathname.split('/object/public/audio/')[1];
  await fetch(`${BASE}/api/audio`, {
    method: 'DELETE',
    headers: authHeaders(),
    body: JSON.stringify({ storagePath }),
  });
}
```

### 1.6 — No changes needed to `src/db/audioDB.js`

The abstraction in `audioDB.js` already routes everything through `apiUploadAudio`, `apiGetAudioUrl`, and `apiDeleteAudio`. The migration is transparent to it.

### 1.7 — Update frontend `.env.example`

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=https://your-railway-backend.railway.app
```

---

## Part 2 — Deployment Setup

### 2.1 — MongoDB Atlas (database)

1. Create account at [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create a **free M0 cluster** (512 MB, shared)
3. Add a database user with a strong password
4. Under **Network Access**, add `0.0.0.0/0` (Railway IPs are dynamic)
5. Copy the connection string → this becomes `MONGO_URI`

### 2.2 — Railway (backend)

Create `server/railway.toml` so Railway knows the start command:

```toml
[deploy]
startCommand = "node index.js"
healthcheckPath = "/"
healthcheckTimeout = 30
```

1. Go to [railway.app](https://railway.app) → **New Project → Deploy from GitHub repo**
2. Select this repository, set **Root Directory** to `server`
3. Railway detects `railway.toml` and runs `node index.js`
4. Under **Variables**, add:

```
MONGO_URI=mongodb+srv://...
JWT_SECRET=<32+ char random string>
CLIENT_ORIGIN=https://your-app.vercel.app
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=<service role key>
PORT=4000
```

5. Under **Settings → Networking**, enable a **Public Domain** — this is your `VITE_API_URL`

### 2.3 — Vercel (frontend)

1. Go to [vercel.com](https://vercel.com) → **New Project → Import Git Repository**
2. Select this repository (root directory stays `/`)
3. Framework: **Vite** (auto-detected)
4. Build command: `npm run build` | Output: `dist`
5. Under **Environment Variables**, add:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
VITE_API_URL=https://your-backend.railway.app
```

6. **After first deploy**, copy the Vercel URL back to Railway's `CLIENT_ORIGIN` variable and redeploy Railway.

---

## Part 3 — GitHub CI/CD

### Strategy

| Trigger | Action |
|---|---|
| Push to any branch / PR | Run CI: lint + build check |
| Push to `main` | Vercel and Railway auto-deploy via GitHub App |

Vercel and Railway each have a **GitHub App** (installed during project setup) that handles production deploys automatically. GitHub Actions handles the quality gate — a failing CI job will block the deploy.

### 3.1 — CI Workflow (lint + build check)

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: ["**"]
  pull_request:
    branches: [main]

jobs:
  frontend:
    name: Frontend — lint & build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Build (validates JSX/imports)
        run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
          VITE_API_URL: ${{ secrets.VITE_API_URL }}

  backend:
    name: Backend — dependency audit
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: server
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: server/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Audit for vulnerabilities
        run: npm audit --audit-level=high
```

### 3.2 — Deploy Workflow (production gate)

Vercel and Railway both deploy automatically when their respective GitHub Apps detect a push to `main` — no custom deploy script is needed. This workflow's purpose is to surface those deployments as named **GitHub Environments** in the repo's Deployments tab and to enforce that CI passes before either platform's GitHub App fires.

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

# CI must pass first — add this as a required status check in branch protection
# so neither Vercel nor Railway receives the push until the build is green.
jobs:
  gate:
    name: Confirm CI passed
    runs-on: ubuntu-latest
    steps:
      - name: All clear
        run: echo "CI green — Vercel and Railway GitHub Apps will now deploy"

  record-frontend:
    name: Record frontend deployment
    runs-on: ubuntu-latest
    needs: gate
    environment:
      name: production-frontend
      url: ${{ vars.VERCEL_URL }}
    steps:
      - run: echo "Vercel auto-deploy in progress via GitHub App"

  record-backend:
    name: Record backend deployment
    runs-on: ubuntu-latest
    needs: gate
    environment:
      name: production-backend
      url: ${{ vars.RAILWAY_URL }}
    steps:
      - run: echo "Railway auto-deploy in progress via GitHub App"
```

> **How auto-deploy works**: When you connect the repo in Vercel/Railway dashboards, each platform installs a GitHub App that listens for push events on `main`. The app triggers a build on their infrastructure independently of GitHub Actions. The workflow above records those deployments in GitHub's UI and can be used as a required status check gate.

### 3.3 — GitHub Secrets and Variables to configure

Navigate to **GitHub repo → Settings → Secrets and variables → Actions**.

**Secrets** (encrypted, used in build steps):

| Secret | Value |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `VITE_API_URL` | Your Railway backend URL |

**Variables** (plain text, used for environment URLs in the Deployments tab):

| Variable | Value |
|---|---|
| `VERCEL_URL` | Your Vercel production URL |
| `RAILWAY_URL` | Your Railway service URL |

> Backend secrets (`MONGO_URI`, `JWT_SECRET`, `SUPABASE_SERVICE_KEY`) are entered directly in Railway's dashboard and never touch GitHub.

### 3.4 — Branch protection rule (recommended)

In **GitHub repo → Settings → Branches → Add rule** for `main`:

- ✅ Require status checks to pass before merging
  - Select: `Frontend — lint & build`
  - Select: `Backend — dependency audit`
- ✅ Require pull request reviews before merging (optional but good practice)
- ✅ Do not allow bypassing the above settings

---

## Part 4 — Implementation Order

```
Step 1  Add server/.env to root .gitignore (security — see Note below)
Step 2  Create Supabase bucket "audio" (5 min, dashboard)
Step 3  npm install @supabase/supabase-js in server/
Step 4  Create server/railway.toml (code above)
Step 5  Replace server/routes/audio.js (code above)
Step 6  Simplify server/db.js — remove GridFS (code above)
Step 7  Update src/lib/api.js — apiGetAudioUrl + apiDeleteAudio (code above)
Step 8  Add VITE_API_URL=http://localhost:4000 to root .env for local testing
Step 9  Update .env.example to include VITE_API_URL placeholder
Step 10 Test locally — record audio, verify it appears in Supabase Storage dashboard
Step 11 Set up MongoDB Atlas M0 — copy MONGO_URI
Step 12 Deploy backend to Railway — add all env vars in Railway dashboard
Step 13 Deploy frontend to Vercel — add all env vars in Vercel dashboard
Step 14 Update Railway CLIENT_ORIGIN to Vercel URL, redeploy Railway service
Step 15 Create .github/workflows/ci.yml and deploy.yml, push to repo
Step 16 In GitHub: add Actions secrets (VITE_* vars) and variables (VERCEL_URL, RAILWAY_URL)
Step 17 Configure branch protection on main
```

---

## Notes

- **`server/.env` not gitignored by default**: The root `.gitignore` only covers `/.env`. Add `server/.env` explicitly to prevent the service role key from ever being committed:
  ```
  # add to .gitignore
  server/.env
  ```
- **Socket.io** works on Railway out of the box — Railway supports persistent WebSocket connections, unlike serverless platforms.
- **Cold starts**: Railway's free $5 credit runs ~500 hours/month. The server stays warm as long as it receives traffic; it does not spin down like Render's free tier.
- **Audio egress**: Supabase free tier includes 2 GB/month outbound. Each stream of a 50 MB file = 50 MB egress. With ~40 plays/month you'll stay well within limits.
- **Existing GridFS data**: Any audio recorded before migration will have a GridFS ObjectId as `audioPath` and will 404 when played. A one-time migration script can be written to re-upload those files to Supabase if needed.
- **Supabase Storage bucket SQL**: The bucket can alternatively be created via the existing `supabase/migrations/` pattern instead of the dashboard — add a new migration file using `storage.buckets` insert if you prefer infrastructure-as-code.
