# spine

A personal reading journal. Track what you're reading, log your thoughts, build annual habit grids, and organize books into custom lists — all in a notebook-inspired UI.

## features

- **reading log** — books grouped by month, per year
- **habit tracker** — monthly calendar grids showing days you read
- **lists** — customizable book lists (most anticipated, favorites, book club, and more)
- **shelf** — full library with search and genre filtering
- **tabs** — bookmark books and lists for quick access from the sidebar
- **goodreads import** — import your reading history via CSV

## tech stack

- [Next.js 15](https://nextjs.org) (App Router)
- [Supabase](https://supabase.com) — Postgres + auth + RLS
- [Tailwind CSS 4](https://tailwindcss.com)
- [Geist Mono](https://vercel.com/font) — primary font

## running locally

**1. clone and install**

```bash
git clone <your-repo-url>
cd spine
npm install
```

**2. set up supabase**

Create a project at [supabase.com](https://supabase.com), then add your credentials to `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**3. run migrations**

Apply the database migrations from the `supabase/` directory via the Supabase dashboard or CLI.

**4. start the dev server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).
