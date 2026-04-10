# Spine

An online reading bullet journal. Log books, write reflections, track reading habits, save quotes, follow series, and review your year.

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Database:** Supabase (Postgres + Auth + RLS)
- **Styling:** Tailwind CSS v4
- **Language:** TypeScript
- **Book metadata:** Google Books API

## Features

- **Library** — Books organized by status: reading, finished, want to read, did not finish
- **Book entries** — Per-book page with reflection, quotes, mood tags, star rating, re-read tracking
- **Monthly spread** — Color-coded reading calendar (sage = streak day, terra = finished, plum = today, gold = quote)
- **Habit tracker** — Year grid of reading days with inline journal entries
- **Quote collection** — All saved quotes across books, per year
- **Reading goals** — Annual auto-tracked goal + custom goals with manually assigned books
- **Series tracker** — Track progress through multi-book series
- **Recommendations** — Log books recommended to/by you with context
- **Custom lists** — Flexible lists (anticipated reads, book club, favorites, etc.)
- **Stats** — Year-in-review with genre breakdown, mood cloud, pace chart, top books
- **Goodreads import** — Import reading history from a Goodreads CSV export
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
/import                    Goodreads CSV import
```

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
GOOGLE_BOOKS_API_KEY=your-google-books-api-key
```

### 4. Run

```bash
npm run dev
```

## Database Schema

| Table | Description |
|-------|-------------|
| `books` | Personal book library with inline metadata (title, author, genres) |
| `thoughts` | Reflection notes per book |
| `book_reads` | Re-read history per book |
| `quotes` | Saved quotes linked to books |
| `reading_log` | Daily reading habit log with notes |
| `reading_goals` | Annual goals (auto-tracked or custom) |
| `goal_books` | Books manually assigned to custom goals |
| `lists` | Custom curated lists |
| `list_items` | Items within a list |
| `series` | Book series tracker |
| `series_books` | Books within a series with read status |
| `recommendations` | Books recommended to/by the user |

## Color Palette

| Token | Hex | Used for |
|-------|-----|----------|
| Plum | `#2D1B2E` | Primary brand, headers, today marker |
| Terra | `#C97B5A` | Finished books, CTAs |
| Sage | `#7B9E87` | Reading streaks, habit tracker, goals |
| Gold | `#D4A843` | Quotes, celebration moments |
| Lavender | `#C4B5D4` | Annotations, quotes accent |
| Cream | `#FAF6F0` | Page background |
