import { NextRequest, NextResponse } from "next/server";
import { createApiClient, getUserId } from "@/lib/supabase-server";

interface UserBookRow {
  id: string;
  title_override: string | null;
  author_override: string | null;
  cover_url: string | null;
  mood_tags: string[] | null;
  date_started: string | null;
  date_finished: string | null;
  rating: number;
  catalog_books: {
    title: string;
    author: string;
    cover_url: string;
  } | null;
}

/**
 * Single endpoint for the home page dashboard.
 * Returns all needed data in one round-trip:
 * - currently reading books (with cover, title, author, moods)
 * - recently finished books (last 4)
 * - counts (finished this year, want-to-read)
 * - reading log for current year (for streak + recent entries)
 * - auto reading goal for current year
 *
 * This replaces 3 separate API calls (books + habits + goals).
 */
export async function GET(req: NextRequest) {
  const supabase = createApiClient(req);
  const userId = getUserId(req);
  if (!userId)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const year =
    Number(req.nextUrl.searchParams.get("year")) || new Date().getFullYear();
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  // Run all queries in parallel — single auth check, parallel DB calls
  const [readingRes, recentFinishedRes, countsRes, logRes, goalRes] =
    await Promise.all([
      // Currently reading — lightweight select, no thoughts/reads needed
      supabase
        .from("user_books")
        .select(
          "id, status, mood_tags, date_started, cover_url, title_override, author_override, catalog_books(title, author, cover_url)",
        )
        .eq("user_id", userId)
        .eq("status", "reading")
        .order("date_started", { ascending: false }),

      // Recently finished — last 4, lightweight
      supabase
        .from("user_books")
        .select(
          "id, status, rating, date_finished, cover_url, title_override, author_override, catalog_books(title, author, cover_url)",
        )
        .eq("user_id", userId)
        .eq("status", "finished")
        .not("date_finished", "is", null)
        .order("date_finished", { ascending: false })
        .limit(4),

      // Counts — only need status column for counting
      supabase
        .from("user_books")
        .select("status, date_finished")
        .eq("user_id", userId)
        .in("status", ["finished", "want-to-read"]),

      // Reading log for current year
      supabase
        .from("reading_log")
        .select("id, log_date, note")
        .eq("user_id", userId)
        .gte("log_date", yearStart)
        .lte("log_date", yearEnd)
        .order("log_date", { ascending: true }),

      // Auto goal for current year
      supabase
        .from("reading_goals")
        .select(
          "id, year, target, name, is_auto, goal_books(book_id), created_at, updated_at",
        )
        .eq("user_id", userId)
        .eq("year", year)
        .eq("is_auto", true)
        .maybeSingle(),
    ]);

  // Flatten reading books
  const reading = ((readingRes.data ?? []) as unknown as UserBookRow[]).map(
    (row) => {
      const cb = row.catalog_books;
      return {
        id: row.id,
        title: row.title_override ?? cb?.title ?? "",
        author: row.author_override ?? cb?.author ?? "",
        coverUrl: row.cover_url || cb?.cover_url || "",
        moodTags: row.mood_tags ?? [],
        dateStarted: row.date_started ?? "",
      };
    },
  );

  // Flatten recently finished
  const recentlyFinished = (
    (recentFinishedRes.data ?? []) as unknown as UserBookRow[]
  ).map((row) => {
    const cb = row.catalog_books;
    return {
      id: row.id,
      title: row.title_override ?? cb?.title ?? "",
      author: row.author_override ?? cb?.author ?? "",
      coverUrl: row.cover_url || cb?.cover_url || "",
      rating: row.rating,
      dateFinished: row.date_finished ?? "",
    };
  });

  // Compute counts
  const allCounts = countsRes.data ?? [];
  const finishedThisYear = allCounts.filter(
    (r) =>
      r.status === "finished" &&
      r.date_finished &&
      r.date_finished >= yearStart &&
      r.date_finished <= yearEnd,
  ).length;
  const wantToReadCount = allCounts.filter(
    (r) => r.status === "want-to-read",
  ).length;

  // Reading log
  const log = (logRes.data ?? []).map((row) => ({
    id: row.id,
    logDate: row.log_date,
    note: row.note ?? "",
  }));

  // Goal
  const goalRow = goalRes.data;
  const goal = goalRow
    ? {
        id: goalRow.id,
        year: goalRow.year,
        target: goalRow.target,
        name: goalRow.name,
        isAuto: goalRow.is_auto,
        bookIds: (goalRow.goal_books ?? []).map(
          (gb: { book_id: string }) => gb.book_id,
        ),
      }
    : null;

  return NextResponse.json({
    reading,
    recentlyFinished,
    finishedThisYear,
    wantToReadCount,
    log,
    goal,
  });
}
