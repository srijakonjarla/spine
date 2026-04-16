# Spine

An online reading bullet journal. Log books, write reflections, track reading habits, save quotes, follow series, and review your year.

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Database:** Supabase (Postgres + Auth + RLS)
- **Styling:** Tailwind CSS v4
- **Language:** TypeScript
- **Book metadata:** Hardcover API (primary) + Google Books API (fallback)

## Features

- **Library** — Books organized by status: reading, finished, want to read, did not finish
- **Book entries** — Per-book page with reflection, quotes, mood tags, star rating, re-read tracking
- **Monthly spread** — Color-coded reading calendar (sage = streak day, terra = finished, plum = today, gold = quote)
- **Habit tracker** — Year grid of reading days with inline journal entries
- **Quote collection** — All saved quotes across books, per year
- **Reading goals** — Annual auto-tracked goal + custom goals with manually assigned books
- **Series tracker** — Track progress through multi-book series; auto-populated from Hardcover when books are added or marked read
- **Recommendations** — Log books recommended to/by you with context
- **Custom lists** — Flexible lists (anticipated reads, book club, favorites, etc.)
- **Stats** — Year-in-review with genre breakdown, mood cloud, pace chart, top books
- **Goodreads import** — Import reading history from a Goodreads CSV export; enriched with Hardcover metadata (cover, ISBN, page count, genres) via batched ISBN lookup
- **Library enrichment** — Backfill cover art, ISBNs, page counts, and genres for existing books from Hardcover
- **Dark mode** — Warm lamplight dark theme

## Routes

```
/                          Home — currently reading, recent books, archive
/library                   Full library (all books)
/library/[status]          Filtered by status: reading, finished, want-to-read
/library/series            Series tracker
/library/recommendations   Recommendations log
/[year]/spread             Monthly reading spread
/[year]/habits             Habit tracker + journal entries
/[year]/quotes             Quote collection
/[year]/lists              Custom lists
/[year]/lists/[listId]     Individual list
/[year]/goal               Reading goals (auto + custom)
/[year]/stats              Year-in-review stats
/[year]/books              Reading log by year
/book/[id]                 Individual book entry
/profile                   Account settings, Goodreads import, library enrichment
```

### Admin API routes

| Route                              | Description                                                                   |
| ---------------------------------- | ----------------------------------------------------------------------------- |
| `POST /api/admin/import-goodreads` | Start a server-side Goodreads CSV import (runs via `after()`, navigable away) |
| `GET  /api/admin/import-goodreads` | Poll import progress from `user_metadata`                                     |
| `POST /api/admin/backfill`         | Enrich all library books with Hardcover metadata (cover, ISBN, pages, genres) |
| `GET  /api/admin/backfill`         | Count books still missing cover/page count/ISBN                               |
| `POST /api/admin/sync-series`      | Bulk-populate series tracker from Hardcover for all finished/reading books    |

## Setup

### 1. Clone and install

```bash
git clone <repo>
cd spine
npm install
```

### 2. Supabase

Create a project at [supabase.com](https://supabase.com), then run `supabase/setup.sql` in the SQL editor to create all tables, policies, and functions.

### 3. Environment variables

Create `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
HARDCOVER_API_TOKEN=your-hardcover-bearer-token   # required for book search & enrichment
GOOGLE_BOOKS_API_KEY=your-google-books-api-key    # optional fallback if Hardcover misses
```

`HARDCOVER_API_TOKEN` is a personal Bearer token from [hardcover.app](https://hardcover.app). Without it, catalog search falls back to Google Books only and library enrichment is disabled.

### 4. Run

```bash
npm run dev
```

## Database Schema

| Table             | Description                                                        |
| ----------------- | ------------------------------------------------------------------ |
| `books`           | Personal book library with inline metadata (title, author, genres) |
| `thoughts`        | Reflection notes per book                                          |
| `book_reads`      | Re-read history per book                                           |
| `quotes`          | Saved quotes linked to books                                       |
| `reading_log`     | Daily reading habit log with notes                                 |
| `reading_goals`   | Annual goals (auto-tracked or custom)                              |
| `goal_books`      | Books manually assigned to custom goals                            |
| `lists`           | Custom curated lists                                               |
| `list_items`      | Items within a list                                                |
| `series`          | Book series tracker                                                |
| `series_books`    | Books within a series with read status                             |
| `recommendations` | Books recommended to/by the user                                   |

## Color Palette

| Token    | Hex       | Used for                              |
| -------- | --------- | ------------------------------------- |
| Plum     | `#2D1B2E` | Primary brand, headers, today marker  |
| Terra    | `#C97B5A` | Finished books, CTAs                  |
| Sage     | `#7B9E87` | Reading streaks, habit tracker, goals |
| Gold     | `#D4A843` | Quotes, celebration moments           |
| Lavender | `#C4B5D4` | Annotations, quotes accent            |
| Cream    | `#FAF6F0` | Page background                       |
