---
description: "Use when modifying MongoDB models, API routes, frontend context state, or database migrations. Ensures docs/index.html data-structures overview stays in sync with any schema changes."
applyTo:
  - "server/models/**"
  - "server/routes/**"
  - "src/context/**"
  - "supabase/migrations/**"
---

# Schema → docs/index.html Sync Rule

Whenever you add, remove, or rename a **field**, **model**, **route**, or **enum value** in any of the matched files, you **must** also update `docs/index.html` to reflect the change in the same response.

## What to update in docs/index.html

### 1. MongoDB Models (Section 2 — cards)
| Change | Action |
|--------|--------|
| New field added to a Mongoose schema | Add a `<tr>` row to the matching card's `<table>` |
| Field removed | Remove the corresponding `<tr>` row |
| Field renamed | Update the `<td>` text in the matching row |
| New model file created | Add a new `.card` block styled with the appropriate `--color` variable |
| Model deleted | Remove the entire `.card` block |
| Index added/changed | Update the index note `<div>` at the bottom of the card |

### 2. ERD Diagram (Section 1 — Mermaid)
| Change | Action |
|--------|--------|
| New field on any entity | Add the field line inside the matching Mermaid entity block |
| Field removed | Remove it from the Mermaid entity block |
| New model | Add a new Mermaid entity and any relationship lines |
| Model deleted | Remove the entity and its relationship lines |
| New foreign-key relationship | Add a Mermaid relationship line (e.g. `User ||--o{ NewModel : "owns"`) |

### 3. REST API Endpoints (Section 5 — route groups)
| Change | Action |
|--------|--------|
| New route added to a router file | Add a `.route-row` inside the matching `.route-group` |
| Route removed | Remove the corresponding `.route-row` |
| Route path or method changed | Update method badge class and path text |
| New router file added | Add a new `.route-group` block with an appropriate header color |

### 4. Frontend Context / Enums (Section 3)
| Change | Action |
|--------|--------|
| New field on Band/Position/Application | Add a `<tr>` to the matching card |
| New enum value (instrument or genre) | Add a `<span>` chip inside the appropriate enum row |
| Enum value removed | Remove the matching `<span>` chip |

### 5. Storage Architecture (Section 6)
Update the relevant arch-box `<ul>` list if a new storage layer is introduced or an existing layer's responsibilities change.

## Style conventions (match existing markup)

- **PK fields**: wrap `<td>` with class `pk` → yellow (`#fbbf24`)
- **FK fields**: wrap `<td>` with class `fk` → blue (`#60a5fa`)
- **Enum fields**: wrap `<td>` with class `enum` → purple (`#c084fc`)
- **Default values**: wrap the secondary `<td>` with `<span class="def">default 'value'</span>`
- HTTP method badge classes: `GET`, `POST`, `PUT`, `DELETE` (match existing CSS)
- Card dot color: use the existing CSS variable for the entity (e.g. `var(--user)`, `var(--track)`)

## Example — adding a field `tempo` (Number) to the Session model

**server/models/Session.js** gains:
```js
tempo: { type: Number, default: 120 }
```

**docs/index.html** Session card — add before the closing `</table>`:
```html
<tr><td>tempo</td><td>Number · <span class="def">default 120</span></td></tr>
```

**docs/index.html** Mermaid ERD — add inside the `Session { … }` block:
```
number tempo
```

Always make both the card update and the ERD update together.
