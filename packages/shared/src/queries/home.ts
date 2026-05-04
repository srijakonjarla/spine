import type { SupabaseClient } from "@supabase/supabase-js";
import { localDateStr } from "../dates";
import type { ReadingLogEntry } from "../types";
import type {
  HomeData,
  HomeFinished,
  HomeGoal,
  HomeReading,
} from "./types";

interface UserBookRow {
  id: string;
  status: string;
  title_override: string | null;
  author_override: string | null;
  mood_tags: string[] | null;
  date_started: string | null;
  date_finished: string | null;
  rating: number;
  catalog_books:
    | {
        title: string;
        author: string;
        cover_url: string | null;
        page_count: number | null;
      }
    | null;
}

interface CountRow {
  id: string;
  status: string;
  date_finished: string | null;
}

interface LogRow {
  id: string;
  log_date: string;
  note: string | null;
  pages_read: number | null;
  logged: boolean;
}

interface GoalRow {
  id: string;
  year: number;
  target: number;
  name: string;
  is_auto: boolean;
  goal_books: { book_id: string }[] | null;
}

/**
 * Pulls everything the home dashboard needs in one round-trip's worth of
 * parallel Supabase queries. RLS handles per-user scoping, so callers don't
 * need to filter by `user_id` themselves.
 */
export async function loadHomeData(
  supabase: SupabaseClient,
  year: number,
): Promise<HomeData> {
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;
  const today = localDateStr();

  const [readingRes, finishedRes, countsRes, logRes, goalRes] =
    await Promise.all([
      supabase
        .from("user_books")
        .select(
          "id, status, mood_tags, date_started, title_override, author_override, catalog_books(title, author, cover_url, page_count)",
        )
        .eq("status", "reading")
        .order("date_started", { ascending: false }),

      supabase
        .from("user_books")
        .select(
          "id, status, rating, date_finished, title_override, author_override, catalog_books(title, author, cover_url, page_count)",
        )
        .eq("status", "finished")
        .not("date_finished", "is", null)
        .order("date_finished", { ascending: false })
        .limit(4),

      supabase
        .from("user_books")
        .select("id, status, date_finished")
        .in("status", ["finished", "want-to-read"]),

      supabase
        .from("reading_log")
        .select("id, log_date, note, pages_read, logged")
        .gte("log_date", yearStart)
        .lte("log_date", yearEnd)
        .order("log_date", { ascending: true }),

      // Year goal — prefer the auto goal, fall back to a custom one
      supabase
        .from("reading_goals")
        .select("id, year, target, name, is_auto, goal_books(book_id)")
        .eq("year", year)
        .order("is_auto", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const reading: HomeReading[] = (
    (readingRes.data ?? []) as unknown as UserBookRow[]
  ).map((row) => ({
    id: row.id,
    title: row.title_override ?? row.catalog_books?.title ?? "",
    author: row.author_override ?? row.catalog_books?.author ?? "",
    coverUrl: row.catalog_books?.cover_url ?? "",
    moodTags: row.mood_tags ?? [],
    dateStarted: row.date_started ?? "",
    pageCount: row.catalog_books?.page_count ?? null,
  }));

  const recentlyFinished: HomeFinished[] = (
    (finishedRes.data ?? []) as unknown as UserBookRow[]
  ).map((row) => ({
    id: row.id,
    title: row.title_override ?? row.catalog_books?.title ?? "",
    author: row.author_override ?? row.catalog_books?.author ?? "",
    coverUrl: row.catalog_books?.cover_url ?? "",
    rating: row.rating,
    dateFinished: row.date_finished ?? "",
  }));

  const counts = (countsRes.data ?? []) as CountRow[];
  const finishedThisYear = counts.filter(
    (r) =>
      r.status === "finished" &&
      r.date_finished &&
      r.date_finished >= yearStart &&
      r.date_finished <= yearEnd,
  ).length;
  const wantToReadCount = counts.filter(
    (r) => r.status === "want-to-read",
  ).length;

  const log: ReadingLogEntry[] = ((logRes.data ?? []) as LogRow[]).map(
    (row) => ({
      id: row.id,
      logDate: row.log_date,
      note: row.note ?? "",
      pagesRead: row.pages_read ?? 0,
      logged: row.logged,
    }),
  );

  const pagesToday = log
    .filter((e) => e.logDate === today)
    .reduce((sum, e) => sum + (e.pagesRead ?? 0), 0);

  const goalRow = goalRes.data as GoalRow | null;
  let goal: HomeGoal | null = null;
  if (goalRow) {
    const pinnedBookIds = (goalRow.goal_books ?? []).map((gb) => gb.book_id);
    let current: number;
    if (goalRow.is_auto) {
      current = finishedThisYear;
    } else {
      const pinnedSet = new Set(pinnedBookIds);
      current = counts.filter(
        (c) =>
          c.status === "finished" &&
          c.date_finished &&
          c.date_finished >= yearStart &&
          c.date_finished <= yearEnd &&
          pinnedSet.has(c.id),
      ).length;
    }
    goal = {
      id: goalRow.id,
      year: goalRow.year,
      target: goalRow.target,
      name: goalRow.name,
      isAuto: goalRow.is_auto,
      current,
      pinnedBookIds,
    };
  }

  return {
    reading,
    recentlyFinished,
    finishedThisYear,
    wantToReadCount,
    log,
    goal,
    pagesToday,
  };
}
