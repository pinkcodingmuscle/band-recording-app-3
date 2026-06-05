import mongoose from 'mongoose';

const PasskeySchema = new mongoose.Schema(
  {
    credentialID: { type: String, required: true },   // base64url-encoded
    publicKey: { type: Buffer, required: true },
    counter: { type: Number, default: 0 },
    transports: [String],
    deviceType: String,
    backedUp: Boolean,
  },
  { _id: false }
);

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String },                   // optional for passkey-only accounts
    displayName: { type: String, required: true, trim: true },
    avatar: { type: String, default: '🎵' },
    passkeyUserId: { type: Buffer },                  // stable WebAuthn user.id bytes
    passkeys: { type: [PasskeySchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model('User', UserSchema);
