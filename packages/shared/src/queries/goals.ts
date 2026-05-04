import type { SupabaseClient } from "@supabase/supabase-js";
import type { ReadingGoal } from "../types";
import type { GoalListItem } from "./types";

interface GoalRow {
  id: string;
  year: number;
  target: number;
  name: string;
  is_auto: boolean;
  goal_books: { book_id: string }[] | null;
  created_at?: string;
  updated_at?: string;
}

function mapGoal(row: GoalRow): ReadingGoal {
  return {
    id: row.id,
    year: row.year,
    target: row.target,
    name: row.name,
    isAuto: row.is_auto,
    bookIds: (row.goal_books ?? []).map((gb) => gb.book_id),
    createdAt: row.created_at ?? "",
    updatedAt: row.updated_at ?? "",
  };
}

/**
 * Lists all goals across all years for the current user, with progress
 * pre-computed for each one. Used by the goals tab / page.
 */
export async function loadGoals(
  supabase: SupabaseClient,
): Promise<GoalListItem[]> {
  const goalsRes = await supabase
    .from("reading_goals")
    .select("id, year, target, name, is_auto, goal_books(book_id), created_at")
    .order("year", { ascending: false })
    .order("created_at", { ascending: true });

  const goals = (goalsRes.data ?? []) as unknown as GoalRow[];
  if (goals.length === 0) return [];

  const years = Array.from(new Set(goals.map((g) => g.year)));
  const yearStart = `${Math.min(...years)}-01-01`;
  const yearEnd = `${Math.max(...years)}-12-31`;

  const finishedRes = await supabase
    .from("user_books")
    .select("id, date_finished")
    .eq("status", "finished")
    .not("date_finished", "is", null)
    .gte("date_finished", yearStart)
    .lte("date_finished", yearEnd);

  const finished = (finishedRes.data ?? []) as Array<{
    id: string;
    date_finished: string | null;
  }>;
  const finishedById = new Set(finished.map((f) => f.id));

  return goals.map((g) => {
    const pinnedIds = (g.goal_books ?? []).map((gb) => gb.book_id);
    const yearStr = String(g.year);
    const yearFinished = finished.filter((f) =>
      f.date_finished?.startsWith(yearStr),
    ).length;
    const pinnedFinished = pinnedIds.filter((id) =>
      finishedById.has(id),
    ).length;
    return {
      id: g.id,
      year: g.year,
      target: g.target,
      name: g.name,
      isAuto: g.is_auto,
      pinnedBookIds: pinnedIds,
      pinnedFinished,
      yearFinished,
    };
  });
}

/**
 * List goals for a single year, returning the legacy `ReadingGoal[]` shape
 * that the web app and providers expect.
 */
export async function loadGoalsForYear(
  supabase: SupabaseClient,
  year: number,
): Promise<ReadingGoal[]> {
  const { data, error } = await supabase
    .from("reading_goals")
    .select(
      "id, year, target, name, is_auto, goal_books(book_id), created_at, updated_at",
    )
    .eq("year", year)
    .order("created_at");

  if (error) throw error;
  return ((data ?? []) as unknown as GoalRow[]).map(mapGoal);
}

/**
 * Generic goal create — used for both auto-yearly goals and custom goals.
 */
export async function setGoal(
  supabase: SupabaseClient,
  opts: {
    userId: string;
    year: number;
    target: number;
    name?: string;
    isAuto?: boolean;
  },
): Promise<ReadingGoal> {
  const { data, error } = await supabase
    .from("reading_goals")
    .insert({
      user_id: opts.userId,
      year: opts.year,
      target: opts.target,
      name: opts.name ?? "",
      is_auto: opts.isAuto ?? false,
    })
    .select(
      "id, year, target, name, is_auto, goal_books(book_id), created_at, updated_at",
    )
    .single();

  if (error) throw error;
  return mapGoal(data as unknown as GoalRow);
}

/**
 * Convenience wrapper for the home/goal-tab "set a year goal" CTA.
 * Always inserts an auto-yearly goal with the standard `${year} reading goal`
 * name. Throws on failure.
 */
export async function createYearGoal(
  supabase: SupabaseClient,
  opts: { userId: string; year: number; target: number },
): Promise<void> {
  await setGoal(supabase, {
    userId: opts.userId,
    year: opts.year,
    target: opts.target,
    name: `${opts.year} reading goal`,
    isAuto: true,
  });
}

export async function updateGoal(
  supabase: SupabaseClient,
  id: string,
  patch: { target?: number; name?: string },
): Promise<void> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.target !== undefined) row.target = patch.target;
  if (patch.name !== undefined) row.name = patch.name;
  const { error } = await supabase
    .from("reading_goals")
    .update(row)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteGoal(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase.from("reading_goals").delete().eq("id", id);
  if (error) throw error;
}

export async function addBookToGoal(
  supabase: SupabaseClient,
  opts: { userId: string; goalId: string; bookId: string },
): Promise<void> {
  const { error } = await supabase.from("goal_books").insert({
    goal_id: opts.goalId,
    book_id: opts.bookId,
    user_id: opts.userId,
  });
  if (error) throw error;
}

export async function removeBookFromGoal(
  supabase: SupabaseClient,
  opts: { goalId: string; bookId: string },
): Promise<void> {
  const { error } = await supabase
    .from("goal_books")
    .delete()
    .eq("goal_id", opts.goalId)
    .eq("book_id", opts.bookId);
  if (error) throw error;
}
