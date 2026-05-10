-- spine database setup
-- Run this in the Supabase SQL editor to initialize the schema from scratch.
-- Tables are created in dependency order.
--
-- Architecture:
--   catalog_books  — shared, ISBN-deduplicated book metadata. One row per edition,
--                    readable by all authenticated users. Enriched once (backfill)
--                    and reused across all users who own the same book.
--   user_books     — per-user library entry. Points to catalog_books and holds
--                    every personal field: status, dates, rating, feeling, etc.
--                    title_override / author_override let users rename without
--                    touching the shared catalog.

-- ============================================================
-- TABLES
-- ============================================================

-- Shared book catalog. Deduped by ISBN when present.
create table if not exists catalog_books (
  id           uuid        primary key default gen_random_uuid(),
  title        text        not null,
  author       text        not null default '',
  cover_url    text        not null default '',
  isbn         text        not null default '',
  release_date text        not null default '',
  genres       text[]      not null default '{}',
  page_count   integer,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Dedup only when ISBN is present; ISBN-less books each get their own row.
create unique index if not exists catalog_books_isbn_unique
  on catalog_books(isbn) where isbn <> '';

-- Per-user library entry (personal fields + link to catalog).
create table if not exists user_books (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references auth.users(id) on delete cascade,
  catalog_book_id  uuid        not null references catalog_books(id),
  -- nullable overrides: let users rename without touching the shared catalog
  title_override   text,
  author_override  text,
  status           text        not null default 'want-to-read',
  date_started     date,
  date_finished    date,
  date_shelved     date,
  date_dnfed       date,
  rating           integer     not null default 0,
  feeling          text        not null default '',
  mood_tags        text[]      not null default '{}',
  bookshelves      text[]      not null default '{}',
  bookmarked       boolean     not null default false,
  up_next          boolean     not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (user_id, catalog_book_id)
);

-- Freeform reflection notes (scoped via user_books).
create table if not exists thoughts (
  id          uuid        primary key default gen_random_uuid(),
  book_id     uuid        not null references user_books(id) on delete cascade,
  text        text        not null,
  page_number integer,
  created_at  timestamptz not null default now()
);

-- Re-read history (scoped via user_books).
create table if not exists book_reads (
  id            uuid        primary key default gen_random_uuid(),
  book_id       uuid        not null references user_books(id) on delete cascade,
  user_id       uuid        references auth.users(id) on delete cascade,
  status        text        not null default 'finished',
  date_started  date,
  date_finished date,
  date_shelved  date,
  date_dnfed    date,
  rating        integer     not null default 0,
  feeling       text        not null default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Saved quotes, optionally linked to a user_books entry.
create table if not exists quotes (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  book_id     uuid        references user_books(id) on delete set null,
  text        text        not null,
  page_number text        not null default '',
  created_at  timestamptz not null default now()
);

-- Daily reading habit log. One row per day logged.
create table if not exists reading_log (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  note     text not null default '',
  unique (user_id, log_date)
);

-- Annual reading goals.
create table if not exists reading_goals (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  year       integer     not null,
  target     integer     not null,
  name       text        not null default '',
  is_auto    boolean     not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Books manually assigned to a custom reading goal.
create table if not exists goal_books (
  id       uuid        primary key default gen_random_uuid(),
  goal_id  uuid        not null references reading_goals(id) on delete cascade,
  book_id  uuid        not null references user_books(id) on delete cascade,
  user_id  uuid        not null references auth.users(id),
  added_at timestamptz not null default now(),
  unique (goal_id, book_id)
);

-- Custom curated lists.
create table if not exists lists (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  year        integer     not null,
  title       text        not null,
  description text        not null default '',
  list_type   text        not null default 'general',
  color       text        not null default 'plum',
  emoji       text        not null default 'Books',
  bullet_symbol text      not null default '→',
  date_label  text        not null default '',
  notes_label text        not null default 'notes',
  sort_order  integer     not null default 0,
  bookmarked  boolean     not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Items within a list.
create table if not exists list_items (
  id           uuid        primary key default gen_random_uuid(),
  list_id      uuid        not null references lists(id) on delete cascade,
  book_id      uuid        references user_books(id) on delete set null,
  title        text        not null default '',
  author       text        not null default '',
  release_date text        not null default '',
  notes        text        not null default '',
  price        text        not null default '',
  type         text        not null default '',
  sort_order   integer     not null default 0,
  created_at   timestamptz not null default now(),
  book_id      uuid        references catalog_books(id) on delete set null
);

-- Book series tracker.
create table if not exists series (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  name       text        not null,
  author     text        not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Books within a series. book_id links to user_books (never null — TBR is created if needed).
create table if not exists series_books (
  id         uuid        primary key default gen_random_uuid(),
  series_id  uuid        not null references series(id) on delete cascade,
  book_id    uuid        references user_books(id) on delete set null,
  position   integer     not null,
  status     text        not null default 'unread',
  created_at timestamptz not null default now()
);

-- Books recommended to or by the user.
create table if not exists recommendations (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references auth.users(id) on delete cascade,
  title          text        not null,
  author         text        not null default '',
  recommended_by text        not null default '',
  notes          text        not null default '',
  direction      text        not null default 'incoming',
  book_id        uuid        references user_books(id) on delete set null,
  created_at     timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table catalog_books     enable row level security;
alter table user_books        enable row level security;
alter table thoughts          enable row level security;
alter table book_reads        enable row level security;
alter table quotes            enable row level security;
alter table reading_log       enable row level security;
alter table reading_goals     enable row level security;
alter table goal_books        enable row level security;
alter table lists             enable row level security;
alter table list_items        enable row level security;
alter table series            enable row level security;
alter table series_books      enable row level security;
alter table recommendations   enable row level security;

-- catalog_books: any authenticated user can read; insert/update open to authenticated
-- (enrichment by one user benefits all users who own that book)
create policy "authenticated read catalog_books"
  on catalog_books for select using (auth.role() = 'authenticated');

create policy "authenticated insert catalog_books"
  on catalog_books for insert with check (auth.role() = 'authenticated');

create policy "authenticated update catalog_books"
  on catalog_books for update using (auth.role() = 'authenticated');

-- user_books: fully scoped to the owning user
create policy "users manage own user_books"
  on user_books for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- thoughts (scoped via user_books)
create policy "users manage own thoughts"
  on thoughts for all
  using  (exists (select 1 from user_books where user_books.id = thoughts.book_id and user_books.user_id = auth.uid()))
  with check (exists (select 1 from user_books where user_books.id = thoughts.book_id and user_books.user_id = auth.uid()));

-- book_reads (scoped via user_books)
create policy "users manage own book_reads"
  on book_reads for all
  using  (exists (select 1 from user_books where user_books.id = book_reads.book_id and user_books.user_id = auth.uid()))
  with check (exists (select 1 from user_books where user_books.id = book_reads.book_id and user_books.user_id = auth.uid()));

-- quotes
create policy "users manage own quotes"
  on quotes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- reading_log
create policy "users manage own reading_log"
  on reading_log for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- reading_goals
create policy "users manage own reading_goals"
  on reading_goals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- goal_books
create policy "users manage own goal_books"
  on goal_books for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- lists
create policy "users manage own lists"
  on lists for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- list_items (scoped via lists)
create policy "users manage own list_items"
  on list_items for all
  using  (exists (select 1 from lists where lists.id = list_items.list_id and lists.user_id = auth.uid()))
  with check (exists (select 1 from lists where lists.id = list_items.list_id and lists.user_id = auth.uid()));

-- series
create policy "users manage own series"
  on series for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- series_books (scoped via series)
create policy "users manage own series_books"
  on series_books for all
  using  (exists (select 1 from series where series.id = series_books.series_id and series.user_id = auth.uid()))
  with check (exists (select 1 from series where series.id = series_books.series_id and series.user_id = auth.uid()));

-- recommendations
create policy "users manage own recommendations"
  on recommendations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- GRANTS
-- ============================================================

grant usage on schema public to authenticated;

grant select, insert, update on catalog_books to authenticated;
grant all on user_books       to authenticated;
grant all on thoughts         to authenticated;
grant all on book_reads       to authenticated;
grant all on quotes           to authenticated;
grant all on reading_log      to authenticated;
grant all on reading_goals    to authenticated;
grant all on goal_books       to authenticated;
grant all on lists            to authenticated;
grant all on list_items       to authenticated;
grant all on series           to authenticated;
grant all on series_books     to authenticated;
grant all on recommendations  to authenticated;

-- ============================================================
-- RPC FUNCTIONS
-- ============================================================

-- Add a reflection note to a book
create or replace function add_thought(
  p_id          uuid,
  p_book_id     uuid,
  p_text        text,
  p_created_at  timestamptz,
  p_page_number integer default null
)
returns void language plpgsql security definer as $$
begin
  insert into thoughts (id, book_id, text, created_at, page_number)
  values (p_id, p_book_id, p_text, p_created_at, p_page_number);
end;
$$;

-- Remove a reflection note from a book
create or replace function remove_thought(
  p_thought_id uuid,
  p_book_id    uuid
)
returns void language plpgsql security definer as $$
begin
  delete from thoughts where id = p_thought_id and book_id = p_book_id;
end;
$$;

-- Archive the current read state and start a fresh read (p_book_id = user_books.id)
create or replace function start_new_read(
  p_book_id       uuid,
  p_status        text,
  p_date_started  date,
  p_date_finished date,
  p_date_shelved  date,
  p_date_dnfed    date,
  p_rating        integer,
  p_feeling       text,
  p_created_at    timestamptz
)
returns void language plpgsql security definer as $$
declare
  v_book user_books%rowtype;
begin
  select * into v_book from user_books where id = p_book_id;

  insert into book_reads (
    book_id, status, date_started, date_finished, date_shelved, date_dnfed,
    rating, feeling, created_at, updated_at
  ) values (
    p_book_id, v_book.status, v_book.date_started, v_book.date_finished,
    v_book.date_shelved, v_book.date_dnfed, v_book.rating, v_book.feeling, p_created_at, now()
  );

  update user_books set
    status        = p_status,
    date_started  = p_date_started,
    date_finished = p_date_finished,
    date_shelved  = p_date_shelved,
    date_dnfed    = p_date_dnfed,
    rating        = p_rating,
    feeling       = p_feeling,
    updated_at    = now()
  where id = p_book_id;
end;
$$;

-- Reorder lists
create or replace function reorder_lists(ids uuid[], orders integer[])
returns void language plpgsql security definer as $$
declare i integer;
begin
  for i in 1..array_length(ids, 1) loop
    update lists set sort_order = orders[i] where id = ids[i];
  end loop;
end;
$$;

-- Reorder list items
create or replace function reorder_list_items(ids uuid[], orders integer[])
returns void language plpgsql security definer as $$
declare i integer;
begin
  for i in 1..array_length(ids, 1) loop
    update list_items set sort_order = orders[i] where id = ids[i];
  end loop;
end;
$$;

grant execute on function add_thought        to authenticated;
grant execute on function remove_thought     to authenticated;
grant execute on function start_new_read     to authenticated;
grant execute on function reorder_lists      to authenticated;
grant execute on function reorder_list_items to authenticated;

-- ============================================================
-- MIGRATION (existing databases only — skip for fresh installs)
-- ============================================================
-- Run the block below once on any database that still has the old `books` table.
-- It preserves all UUIDs so existing FK references (thoughts, book_reads, etc.)
-- remain valid; only the FK constraint targets change.
--
-- do $$
-- declare
--   v_rep_id uuid;
-- begin
--   -- 1. Populate catalog_books.
--   --    For books that share an ISBN, pick the most recently-updated row as the
--   --    representative and reuse its UUID as the catalog_books.id.
--   --    ISBN-less books each get their own catalog row (no dedup).
--
--   insert into catalog_books (id, title, author, cover_url, isbn, release_date, genres, page_count, created_at, updated_at)
--   select
--     (array_agg(id order by updated_at desc))[1] as id,
--     (array_agg(title order by updated_at desc))[1],
--     (array_agg(author order by updated_at desc))[1],
--     coalesce(nullif((array_agg(cover_url order by length(cover_url) desc))[1], ''), ''),
--     isbn,
--     coalesce(nullif((array_agg(release_date order by length(release_date) desc))[1], ''), ''),
--     (array_agg(genres order by array_length(genres,1) desc nulls last))[1],
--     max(page_count),
--     min(created_at),
--     max(updated_at)
--   from books
--   group by
--     case when isbn <> '' then isbn else id::text end,
--     isbn
--   on conflict (isbn) where isbn <> '' do nothing;
--
--   -- 2. Populate user_books (keep the original books.id as user_books.id so all
--   --    child FK references stay valid without touching the child tables).
--
--   insert into user_books (
--     id, user_id, catalog_book_id,
--     status, date_started, date_finished, date_shelved,
--     rating, feeling, mood_tags, bookmarked,
--     created_at, updated_at
--   )
--   select
--     b.id,
--     b.user_id,
--     -- find the catalog_books row for this isbn group
--     coalesce(
--       (select cb.id from catalog_books cb where cb.isbn = b.isbn and b.isbn <> '' limit 1),
--       (select cb.id from catalog_books cb where cb.id = b.id limit 1)
--     ),
--     b.status, b.date_started, b.date_finished, b.date_shelved,
--     b.rating, b.feeling, b.mood_tags, b.bookmarked,
--     b.created_at, b.updated_at
--   from books b
--   on conflict (id) do nothing;
--
--   -- 3. Drop old FK constraints and re-point them at user_books.
--   --    (child table data is unchanged; only the constraint target moves)
--
--   alter table thoughts     drop constraint if exists thoughts_book_id_fkey;
--   alter table thoughts     add  constraint thoughts_book_id_fkey
--     foreign key (book_id) references user_books(id) on delete cascade;
--
--   alter table book_reads   drop constraint if exists book_reads_book_id_fkey;
--   alter table book_reads   add  constraint book_reads_book_id_fkey
--     foreign key (book_id) references user_books(id) on delete cascade;
--
--   alter table quotes       drop constraint if exists quotes_book_id_fkey;
--   alter table quotes       add  constraint quotes_book_id_fkey
--     foreign key (book_id) references user_books(id) on delete set null;
--
--   alter table goal_books   drop constraint if exists goal_books_book_id_fkey;
--   alter table goal_books   add  constraint goal_books_book_id_fkey
--     foreign key (book_id) references user_books(id) on delete cascade;
--
--   alter table series_books drop constraint if exists series_books_book_id_fkey;
--   alter table series_books add  constraint series_books_book_id_fkey
--     foreign key (book_id) references user_books(id) on delete set null;
--
--   alter table recommendations drop constraint if exists recommendations_book_id_fkey;
--   alter table recommendations add  constraint recommendations_book_id_fkey
--     foreign key (book_id) references user_books(id) on delete set null;
--
--   -- 4. Drop the old books table (only after verifying user_books looks correct).
--   -- drop table books;
-- end;
-- $$;
