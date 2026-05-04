# Spine

An online reading bullet journal. Log books, write reflections, track reading habits, save quotes, follow series, and review your year.

## Project Structure

Monorepo with two apps and a shared package:

```
apps/
  web/        Next.js web app
  mobile/     Expo / React Native iOS app
packages/
  shared/     Shared types, constants, dates utilities, and Supabase queries
```

## Tech Stack

### Web (`apps/web`)
- **Framework:** Next.js 16 (App Router)
- **Database:** Supabase (Postgres + Auth + RLS)
- **Styling:** Tailwind CSS v4
- **Language:** TypeScript
- **Book metadata:** Hardcover API (primary) + Google Books API (fallback)

### Mobile (`apps/mobile`)
- **Framework:** Expo (SDK 54) + Expo Router
- **Auth:** Supabase + native Google Sign-In via `@react-native-google-signin/google-signin`
- **Storage:** `expo-secure-store` for session persistence
- **Language:** TypeScript

## Architecture

Both clients talk to the same Postgres database directly. **Row-Level Security policies are the enforcement boundary** — there is no separate backend service.

- **Shared queries (`packages/shared/src/queries/`)** are the single source of truth for read/write logic. Each function takes a `SupabaseClient` and runs against the user's session JWT; RLS scopes results to the current user.
- **Mobile** (`apps/mobile/lib/`) imports the shared functions, pre-bound to its native Supabase client.
- **Web** (`apps/web/app/lib/`) imports the same functions from React components.
- **Server API routes** (`apps/web/app/api/`) are reserved for things that genuinely need server-side compute — Hardcover lookups with secret tokens, the Goodreads CSV import that runs after the response, library enrichment, etc. The pure-CRUD routes (home, goals, habits) were removed in favor of direct shared-query calls.

## Features

- **Library** — Books organized by status: reading, finished, want to read, did not finish
- **Book entries** — Per-book page with reflection, quotes, mood tags, star rating, re-read tracking
- **Monthly spread** — Color-coded reading calendar (sage = streak day, terra = finished, plum = today, gold = quote)
- **Habit tracker** — Year grid of reading days with inline journal entries
- **Quote collection** — All saved quotes across books, per year
- **Reading goals** — Annual yearly goal + custom goals with manually pinned books; created explicitly via the goals page
- **Series tracker** — Track progress through multi-book series; auto-populated from Hardcover when books are added or marked read
- **Recommendations** — Log books recommended to/by you with context
- **Custom lists** — Flexible lists (anticipated reads, book club, favorites, etc.)
- **Stats** — Year-in-review with genre breakdown, mood cloud, pace chart, top books
- **Goodreads import** — Import reading history from a Goodreads CSV export; enriched with Hardcover metadata (cover, ISBN, page count, genres) via batched ISBN lookup
- **Library enrichment** — Backfill cover art, ISBNs, page counts, and genres for existing books from Hardcover
- **Dark mode** — Warm lamplight dark theme (web)

## Routes (Web)

```
/                          Home — currently reading, recent books, archive
/library                   Full library (all books)
/library/[status]          Filtered by status: reading, finished, want-to-read
/library/rereads           Re-read history
/library/series            Series tracker
/library/recommendations   Recommendations log
/[year]                    Year index — stats, bookshelf, recent log
/[year]/[month]            Monthly spread with day panel
/[year]/read               Books read by month
/[year]/quotes             Quote collection
/[year]/lists              Custom lists
/[year]/lists/[listId]     Individual list
/[year]/goal               Reading goals (auto + custom)
/[year]/review             Year-in-review stats
/[year]/books              Log a new book
/book/[id]                 Individual book entry (reflection, timeline, quotes, details tabs)
/profile                   Account settings, Goodreads import, library enrichment
/login                     Auth (email, password, magic link, signup)
```

## Screens (Mobile)

```
/login                     Auth — landing, sign in, sign up, forgot, choose username
/(tabs)/                   Bottom-tab shell with six tabs:
  index                      today (home dashboard)
  library                    library (every book)
  calendar                   month spread
  lists                      tbr & series
  goals                      reading goals
  you                        year-in-review + sign out
/terms                     Terms of service
/privacy                   Privacy policy
```

## Server API Routes (`apps/web/app/api`)

Only routes that need server-side compute remain. CRUD-only routes (home, goals, habits) were removed; their logic now lives in `packages/shared/src/queries/` and is called directly from both clients.

| Route                              | Why it's server-side                                                          |
| ---------------------------------- | ----------------------------------------------------------------------------- |
| `/api/books/[id]` (PATCH)          | Triggers auto-log + series sync + catalog merge as side effects               |
| `/api/catalog`                     | Calls Hardcover with secret bearer token                                      |
| `/api/items`, `/api/lists`         | Custom list management                                                        |
| `/api/quotes`, `/api/reads`        | Quote + re-read CRUD with ordering logic                                      |
| `/api/recommendations`             | Recommendation CRUD                                                           |
| `/api/series`                      | Series tracker (transactional updates)                                        |
| `/api/nav`                         | Navigation data (year list, current month)                                    |
| `/api/invite`                      | Invite-code auth flow                                                         |
| `/api/admin/import-goodreads`      | CSV import via `after()` so the user can navigate away                        |
| `/api/admin/backfill`              | Bulk Hardcover enrichment of existing library                                 |

## Setup

### 1. Clone and install

```bash
git clone <repo>
cd spine
npm install
```

### 2. Supabase

Create a project at [supabase.com](https://supabase.com), then run `supabase/setup.sql` in the SQL editor to create all tables, RLS policies, and functions.

### 3. Environment variables

**Web** — create `apps/web/.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your-anon-key
HARDCOVER_API_TOKEN=your-hardcover-bearer-token   # required for book search & enrichment
GOOGLE_BOOKS_API_KEY=your-google-books-api-key    # optional fallback if Hardcover misses
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key   # required for admin imports/backfill
```

`HARDCOVER_API_TOKEN` is a personal Bearer token from [hardcover.app](https://hardcover.app). Without it, catalog search falls back to Google Books only and library enrichment is disabled.

**Mobile** — create `apps/mobile/.env.local`:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=xxx.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=yyy.apps.googleusercontent.com
```

For Google Sign-In on mobile:
1. Create OAuth clients in the [Google Cloud Console](https://console.cloud.google.com) — one **iOS** client (bundle id `com.spine.app`) and one **Web** client.
2. Add both client IDs to your Supabase project's **Auth → Providers → Google**, and enable **Skip nonce checks** (Google's iOS SDK injects a nonce that gotrue can't predict).
3. Set the iOS client's reversed scheme as `iosUrlScheme` in `apps/mobile/app.json` under the `@react-native-google-signin/google-signin` plugin entry.

### 4. Run

```bash
# Web
npm run web

# Mobile (iOS — requires Xcode + an iOS Simulator runtime)
npm run mobile
# or for a fresh native build:
cd apps/mobile && npx expo run:ios
```

## Database Schema

| Table             | Description                                                             |
| ----------------- | ----------------------------------------------------------------------- |
| `catalog_books`   | Shared book catalog (title, author, cover, ISBN, genres, page count)    |
| `user_books`      | Per-user book entries with status, rating, feeling, dates, mood tags    |
| `thoughts`        | Reflection notes per book                                               |
| `book_reads`      | Re-read history per book                                                |
| `quotes`          | Saved quotes linked to books                                            |
| `reading_log`     | Daily reading habit log with notes and pages-read                       |
| `reading_goals`   | Annual goals (auto-tracked or custom)                                   |
| `goal_books`      | Books manually assigned to custom goals                                 |
| `lists`           | Custom curated lists                                                    |
| `list_items`      | Items within a list                                                     |
| `series`          | Book series tracker                                                     |
| `series_books`    | Books within a series with read status                                  |
| `recommendations` | Books recommended to/by the user                                        |
| `profiles`        | Display name, username, avatar per user                                 |

All user-scoped tables are protected by Row-Level Security policies that match `auth.uid() = user_id` (or transitively via parent tables for `thoughts`, `book_reads`, `list_items`).

## Color Palette

| Token    | Hex       | Used for                              |
| -------- | --------- | ------------------------------------- |
| Plum     | `#2D1B2E` | Primary brand, headers, today marker  |
| Terra    | `#C97B5A` | Finished books, CTAs                  |
| Sage     | `#7B9E87` | Reading streaks, habit tracker, goals |
| Gold     | `#D4A843` | Quotes, celebration moments           |
| Lavender | `#C4B5D4` | Annotations, quotes accent            |
| Cream    | `#FAF6F0` | Page background                       |
