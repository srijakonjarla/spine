import {
  addBookToGoal as addBookToGoalShared,
  deleteGoal as deleteGoalShared,
  loadGoalsForYear,
  removeBookFromGoal as removeBookFromGoalShared,
  setGoal as setGoalShared,
  updateGoal as updateGoalShared,
} from "@spine/shared";
import { supabase } from "@/lib/supabase";
import type { ReadingGoal } from "@/types";

async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("not signed in");
  return data.user.id;
}

export async function getGoals(year: number): Promise<ReadingGoal[]> {
  return loadGoalsForYear(supabase, year);
}

export async function setGoal(
  year: number,
  target: number,
  name: string,
  isAuto = false,
): Promise<ReadingGoal> {
  const userId = await currentUserId();
  return setGoalShared(supabase, { userId, year, target, name, isAuto });
}

export async function updateGoal(
  id: string,
  patch: { target?: number; name?: string },
): Promise<void> {
  await updateGoalShared(supabase, id, patch);
}

export async function deleteGoal(id: string): Promise<void> {
  await deleteGoalShared(supabase, id);
}

export async function addBookToGoal(
  goalId: string,
  bookId: string,
): Promise<void> {
  const userId = await currentUserId();
  await addBookToGoalShared(supabase, { userId, goalId, bookId });
}

export async function removeBookFromGoal(
  goalId: string,
  bookId: string,
): Promise<void> {
  await removeBookFromGoalShared(supabase, { goalId, bookId });
}
