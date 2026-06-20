# The Archive

> "The Archive is not a productivity tool. It is a machine for accumulating observations until they become literature."

A literary and philosophical knowledge archive for writers, filmmakers, artists, and thinkers — built in the spirit of Tarkovsky's journals, Sontag's notebooks, and the commonplace book tradition. It rejects streaks, scores, and notifications in favor of slowness, recurrence, and discovery.

---

## 1. Product Architecture

```
┌─────────────────────────────────────────────┐
│                   React UI                    │
│  Pages → Components → Hooks → Stores (Zustand)│
└───────────────────┬───────────────────────────┘
                     │
┌────────────────────▼───────────────────────────┐
│              Services Layer                     │
│  entries.ts · entities.ts · images.ts            │
│  (pure functions, no React, fully testable)       │
└────────────────────┬───────────────────────────┘
                     │
┌────────────────────▼───────────────────────────┐
│             Supabase Client                      │
│  Auth · Postgres (RLS) · Storage                  │
└──────────────────────────────────────────────────┘
```

No custom backend. All business logic lives in the `services/` layer as
plain async functions that call Supabase directly. Row Level Security (RLS)
enforces per-user data isolation at the database layer — the same guarantee
holds whether the call comes from the web app, a future mobile client, or
a script.

---

## 2. Database Schema

See `supabase/schema.sql` for the complete, runnable SQL. Summary:

| Table            | Purpose                                                    |
|-------------------|-------------------------------------------------------------|
| `entries`         | Journal entries (title, HTML content, plain-text mirror)   |
| `entry_images`    | Images attached to entries, ordered, captioned              |
| `entities`        | Unified table for all entity types (theme/character/place/…) |
| `entry_entities`  | Many-to-many join: which entities appear in which entries   |
| `annotations`     | V3 manuscript-style highlights, linked to entities by offset |

**Design decisions:**

- **Single `entities` table with a `type` enum**, not nine separate tables.
  This was the one deliberate deviation from the brief's literal "themes /
  characters / places" table list — a polymorphic design scales to new
  entity types (the brief explicitly asks for future expansion) without
  schema migrations, and lets `entry_entities` be one join table instead of
  N. A `UNIQUE(user_id, type, slug)` constraint gives the no-duplicates
  guarantee the brief requires, enforced by Postgres `UPSERT`, not
  application logic.
- **`raw_content` mirrors `content`** (HTML stripped to plain text) so
  Postgres full-text search (`tsvector`) and entity-symbol extraction never
  have to parse HTML.
- **`annotations` stores character offsets**, not DOM ranges, so links
  survive re-renders and are portable to any future renderer (PDF export,
  mobile, etc).
- All tables carry `user_id` and RLS policies of the form
  `auth.uid() = user_id` — no row is visible across accounts.

---

## 3. Folder Structure

```
the-archive/
├── supabase/
│   └── schema.sql              # Full schema, RLS, functions, storage policy
├── src/
│   ├── types/index.ts          # All TypeScript interfaces
│   ├── lib/
│   │   ├── supabase.ts         # Client singleton
│   │   └── extraction.ts       # Symbol parsing, slugs, date formatting
│   ├── services/                # Pure data-access functions
│   │   ├── entries.ts
│   │   ├── entities.ts
│   │   └── images.ts            # also owns annotations (V3)
│   ├── stores/index.ts          # Zustand: auth, entries, entities, editor
│   ├── components/
│   │   ├── layout/AppShell.tsx
│   │   ├── editor/ManuscriptEditor.tsx   # contentEditable + annotation UI
│   │   ├── images/ImageStrip.tsx
│   │   └── entities/EntityPanel.tsx
│   └── pages/
│       ├── AuthPage.tsx
│       ├── EntriesPage.tsx      # the Archive list
│       ├── NewEntryPage.tsx
│       ├── EntryPage.tsx        # the manuscript view
│       ├── EntitiesPage.tsx     # the Index
│       ├── EntityPage.tsx
│       └── SearchPage.tsx
├── index.html
├── tailwind.config.js
└── package.json
```

---

## 4. Routing

| Path               | Page          | Auth required |
|----------------------|---------------|:---:|
| `/auth`             | Sign in / sign up | – |
| `/entries`          | Archive (entry list) | ✓ |
| `/entries/new`      | Creates a draft, redirects | ✓ |
| `/entries/:id`      | Manuscript editor | ✓ |
| `/entities`         | Index (all entities) | ✓ |
| `/entities/:id`     | Single entity, its entries | ✓ |
| `/search`           | Full-text search | ✓ |

---

## 5. Entity Architecture

Entities flow into the system through **two independent paths** that
converge on the same `entities` / `entry_entities` tables:

1. **V2 — Symbol extraction.** Typing `#Theme`, `@Character`, `$Place`
   anywhere in an entry. On save, `extractEntitiesFromText()` regex-parses
   the raw text, and `syncExtractedEntities()` upserts each match and links
   it to the entry with `source: 'symbol'`.
2. **V3 — Manuscript annotation.** Select any text, press `Tab`. A popup
   offers all nine entity types; choosing one opens a naming dialog
   (pre-filled with the selection). Confirming creates a row in
   `annotations` (with character offsets) *and* an `entry_entities` link
   with `source: 'annotation'`.

Both paths call the same `upsertEntity()` — so a character introduced via
`@TeaSeller` and later annotated as "the tea seller" resolve to the same
entity if the slug matches, with no duplicate.

The `entry_entities.source` column preserves *how* a link was made, which
the future Constellation View can use to weight or visualize differently.

---

## 6. Image Architecture

- Files upload directly to a private Supabase Storage bucket
  (`archive-images`), namespaced `userId/entryId/filename`, gated by a
  storage RLS policy matching the path's first folder segment to
  `auth.uid()`.
- `entry_images` stores the storage key, a cached public URL, dimensions
  (read client-side via an `Image()` probe before upload), caption, and
  `position` for manual reordering.
- The `.archive-photo` CSS class gives images a deliberate paper-and-shadow
  treatment — border, layered box-shadow, generous margin — so they read as
  *pasted* into the page rather than attached to it.

---

## 7. Annotation Architecture (V3)

`ManuscriptEditor` is a `contentEditable` div instrumented to:

1. Listen for `Tab` while a selection is active inside the editor.
2. Compute the selection's **character offset** relative to the editor
   root (not the DOM range) by building a synthetic `Range` from the
   editor's start to the selection start and measuring `.toString().length`.
   This makes offsets stable across re-renders and storage.
3. Show a borderless, archival-styled popup (`AnnotationPopup`) listing
   entity types.
4. On type choice, show `EntityNameDialog`, pre-filled with the selected
   text, confirmable with `Enter`.
5. Call back to `EntryPage`, which upserts the entity, writes the
   `annotations` row, and links it to the entry.

No visible tag markup is ever injected into the contentEditable HTML in V3
— annotations are tracked structurally (offsets in a side table), keeping
the manuscript's prose untouched, exactly as the brief specifies
("no ugly hashtags, no visible tags").

---

## 8. State Management

Four small Zustand stores, each owning one concern:

- `useAuthStore` — session, sign in/up/out, hydrates from
  `supabase.auth.getSession()` and subscribes to `onAuthStateChange`.
- `useEntriesStore` — the entry list cache + search results.
- `useEntitiesStore` — the entity index cache.
- `useEditorStore` — autosave status (`isDirty` / `isSaving` / `lastSaved`)
  for the currently open entry.

No global cache invalidation framework — at this scale, direct service
calls plus targeted store updates (`upsertEntry`, `removeEntry`) are
simpler to reason about than a query-cache layer, and keep the dependency
list short for a project meant to last decades.

---

## 9. Setup

```bash
npm install

cp .env.example .env
# fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
# from your Supabase project → Settings → API

# In the Supabase SQL editor, run supabase/schema.sql in full.

# Create the storage bucket (schema.sql includes the RLS policy,
# but the bucket itself must be created via dashboard or API):
#   Storage → New bucket → name: archive-images → Public: OFF

npm run dev
```

Auth: Supabase email/password is enabled by default. Email confirmation
can be toggled off in Supabase → Authentication → Settings for faster
local testing.

---

## 10. Implementation Status

**V1 — complete.** Create, edit, delete, view entries. Title + rich text
content. Image upload, embedding, captioning, drag-and-drop, reordering by
position. Full-text search via Postgres `tsvector` + `ts_rank`.

**V2 — complete.** `#Theme @Character $Place` symbol extraction on save.
Dedicated entity tables collapsed into one polymorphic `entities` table
plus `entry_entities` join, per the brief's "support future entity
expansion" requirement. Per-entity pages showing every entry it appears in.
No duplicate entities — enforced by `UNIQUE(user_id, type, slug)` +
`UPSERT`.

**V3 — complete.** Tab-to-annotate workflow: select text, choose a type
from a popup, name the entity, done. Offsets stored separately from
content so the manuscript stays clean. (Note: the brief's "subtle
suggestion" flow for re-detecting a previously created entity — e.g.
typing "the tea seller" again and getting an inline accept/dismiss prompt
— is scaffolded in `lib/extraction.ts` as `findEntitySuggestions()`, which
does substring matching against existing entity names, but is not yet
wired into the editor's live typing event loop. That's the next piece of
work, noted below.)

---

## 11. Where V4 Picks Up

The schema and service layer were built so these don't require migrations:

- **Recurring Motifs** — `get_entity_frequencies()` already powers entity
  sort order on the Index page; a dedicated "Motifs" view just needs a
  frequency-over-time bucket query and a chart.
- **Theme / Character / Place Graphs, Constellation View** — `entry_entities`
  is already the edge list of an entry↔entity bipartite graph; a
  entity↔entity co-occurrence graph is one more query (entities sharing an
  `entry_id`) away from a force-directed layout.
- **Live entity-suggestion-while-typing** — wire
  `findEntitySuggestions()` into an `onInput` debounce in
  `ManuscriptEditor`, rendering a dismissible inline chip rather than
  requiring the Tab-select flow for entities the system already knows.
- **Novella Mode** — `raw_content` plus the entity graph is the structured
  corpus a future "transform notes into essay/book" feature would read
  from; no new tables needed, only a new service that reads across many
  entries filtered by entity or date range.
