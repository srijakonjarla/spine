import { apiFetch } from "@/lib/api";
import type { ReadingGoal } from "@/types";

interface GoalBookRow { book_id: string }

interface GoalRow {
  id: string;
  year: number;
  target: number;
  name: string;
  is_auto: boolean;
  goal_books: GoalBookRow[];
  created_at: string;
  updated_at: string;
}

function mapGoal(row: GoalRow): ReadingGoal {
  return {
    id: row.id,
    year: row.year,
    target: row.target,
    name: row.name,
    isAuto: row.is_auto,
    bookIds: (row.goal_books ?? []).map((gb) => gb.book_id),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getGoals(year: number): Promise<ReadingGoal[]> {
  const res = await apiFetch(`/api/goals?year=${year}`);
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return (data as GoalRow[]).map(mapGoal);
}

export async function setGoal(
  year: number,
  target: number,
  name: string,
  isAuto = false
): Promise<ReadingGoal> {
  const res = await apiFetch("/api/goals", {
    method: "POST",
    body: JSON.stringify({ year, target, name, is_auto: isAuto }),
  });
  const row: GoalRow = await res.json();
  return mapGoal(row);
}

export async function updateGoal(id: string, patch: { target?: number; name?: string }): Promise<void> {
  await apiFetch(`/api/goals/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function deleteGoal(id: string): Promise<void> {
  await apiFetch(`/api/goals/${id}`, { method: "DELETE" });
}

export async function addBookToGoal(goalId: string, bookId: string): Promise<void> {
  await apiFetch(`/api/goals/${goalId}/books`, {
    method: "POST",
    body: JSON.stringify({ bookId }),
  });
}

export async function removeBookFromGoal(goalId: string, bookId: string): Promise<void> {
  await apiFetch(`/api/goals/${goalId}/books/${bookId}`, { method: "DELETE" });
}
