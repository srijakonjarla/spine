-- spine database setup
-- Run this in the Supabase SQL editor to initialize the schema from scratch.
-- Tables are created in dependency order.

-- ============================================================
-- TABLES
-- ============================================================

-- Personal book library. Metadata (title, author, genres, cover) is stored directly
-- on the row — no shared catalog table. Hardcover API is queried at write time
-- (Google Books as fallback). cover_url, isbn, page_count are enriched via the
-- /api/admin/backfill route after import.
create table if not exists books (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references auth.users(id) on delete cascade,
  title         text        not null,
  author        text        not null default '',
  release_date  text        not null default '',
  genres        text[]      not null default '{}',
  cover_url     text        not null default '',
  isbn          text        not null default '',
  page_count    integer,
  status        text        not null default 'want-to-read',
  date_started  date,
  date_finished date,
  date_shelved  date,
  rating        integer     not null default 0,
  feeling       text        not null default '',
  mood_tags     text[]      not null default '{}',
  bookmarked    boolean     not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Freeform reflection notes per book (the journal entry for a book).
create table if not exists thoughts (
  id         uuid        primary key default gen_random_uuid(),
  book_id    uuid        not null references books(id) on delete cascade,
  text       text        not null,
  created_at timestamptz not null default now()
);

-- Re-read history. Each time a book is re-read, the previous read is archived here.
create table if not exists book_reads (
  id            uuid        primary key default gen_random_uuid(),
  book_id       uuid        not null references books(id) on delete cascade,
  user_id       uuid        references auth.users(id) on delete cascade,
  status        text        not null default 'finished',
  date_started  date,
  date_finished date,
  date_shelved  date,
  rating        integer     not null default 0,
  feeling       text        not null default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Saved quotes, optionally linked to a book.
create table if not exists quotes (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  book_id     uuid        references books(id) on delete set null,
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

-- Annual reading goals. is_auto = true means it auto-tracks all finished books.
-- Custom goals (is_auto = false) track books via goal_books.
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
  book_id  uuid        not null references books(id) on delete cascade,
  user_id  uuid        not null references auth.users(id),
  added_at timestamptz not null default now(),
  unique (goal_id, book_id)
);

-- Custom curated lists (TBR, book club, anticipated, etc.).
create table if not exists lists (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  year        integer     not null,
  title       text        not null,
  description text        not null default '',
  list_type   text        not null default 'general',
  date_label  text        not null default '',
  notes_label text        not null default 'notes',
  sort_order  integer     not null default 0,
  bookmarked  boolean     not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Items within a list. Title/author stored inline.
create table if not exists list_items (
  id           uuid        primary key default gen_random_uuid(),
  list_id      uuid        not null references lists(id) on delete cascade,
  title        text        not null default '',
  author       text        not null default '',
  release_date text        not null default '',
  notes        text        not null default '',
  price        text        not null default '',
  type         text        not null default '',
  sort_order   integer     not null default 0,
  created_at   timestamptz not null default now()
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

-- Books within a series, with position and read status.
-- status: 'unread' | 'reading' | 'read' | 'skipped'
create table if not exists series_books (
  id         uuid        primary key default gen_random_uuid(),
  series_id  uuid        not null references series(id) on delete cascade,
  book_id    uuid        references books(id) on delete set null,
  title      text        not null,
  position   integer     not null,
  status     text        not null default 'unread',
  created_at timestamptz not null default now()
);

-- Books recommended to or by the user.
-- direction: 'incoming' (recommended to me) | 'outgoing' (recommended by me)
create table if not exists recommendations (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references auth.users(id) on delete cascade,
  title          text        not null,
  author         text        not null default '',
  recommended_by text        not null default '',
  notes          text        not null default '',
  direction      text        not null default 'incoming',
  book_id        uuid        references books(id) on delete set null,
  created_at     timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table books            enable row level security;
alter table thoughts         enable row level security;
alter table book_reads       enable row level security;
alter table quotes           enable row level security;
alter table reading_log      enable row level security;
alter table reading_goals    enable row level security;
alter table goal_books       enable row level security;
alter table lists            enable row level security;
alter table list_items       enable row level security;
alter table series           enable row level security;
alter table series_books     enable row level security;
alter table recommendations  enable row level security;

-- books
create policy "users manage own books"
  on books for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- thoughts (scoped via books)
create policy "users manage own thoughts"
  on thoughts for all
  using  (exists (select 1 from books where books.id = thoughts.book_id and books.user_id = auth.uid()))
  with check (exists (select 1 from books where books.id = thoughts.book_id and books.user_id = auth.uid()));

-- book_reads (scoped via books)
create policy "users manage own book_reads"
  on book_reads for all
  using  (exists (select 1 from books where books.id = book_reads.book_id and books.user_id = auth.uid()))
  with check (exists (select 1 from books where books.id = book_reads.book_id and books.user_id = auth.uid()));

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

grant all on books           to authenticated;
grant all on thoughts        to authenticated;
grant all on book_reads      to authenticated;
grant all on quotes          to authenticated;
grant all on reading_log     to authenticated;
grant all on reading_goals   to authenticated;
grant all on goal_books      to authenticated;
grant all on lists           to authenticated;
grant all on list_items      to authenticated;
grant all on series          to authenticated;
grant all on series_books    to authenticated;
grant all on recommendations to authenticated;

-- ============================================================
-- RPC FUNCTIONS
-- ============================================================

-- Add a reflection note to a book
create or replace function add_thought(
  p_id         uuid,
  p_book_id    uuid,
  p_text       text,
  p_created_at timestamptz
)
returns void language plpgsql security definer as $$
begin
  insert into thoughts (id, book_id, text, created_at)
  values (p_id, p_book_id, p_text, p_created_at);
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

-- Archive the current read state and start a fresh read
create or replace function start_new_read(
  p_book_id       uuid,
  p_status        text,
  p_date_started  date,
  p_date_finished date,
  p_date_shelved  date,
  p_rating        integer,
  p_feeling       text,
  p_created_at    timestamptz
)
returns void language plpgsql security definer as $$
declare
  v_book books%rowtype;
begin
  select * into v_book from books where id = p_book_id;

  insert into book_reads (
    book_id, status, date_started, date_finished, date_shelved,
    rating, feeling, created_at, updated_at
  ) values (
    p_book_id, v_book.status, v_book.date_started, v_book.date_finished,
    v_book.date_shelved, v_book.rating, v_book.feeling, p_created_at, now()
  );

  update books set
    status        = p_status,
    date_started  = p_date_started,
    date_finished = p_date_finished,
    date_shelved  = p_date_shelved,
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
