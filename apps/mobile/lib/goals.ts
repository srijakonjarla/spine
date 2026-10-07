import {
  addBookToGoal as addBookToGoalShared,
  deleteGoal as deleteGoalShared,
  loadGoals as loadGoalsShared,
  loadGoalsForYear as loadGoalsForYearShared,
  removeBookFromGoal as removeBookFromGoalShared,
  setGoal as setGoalShared,
  updateGoal as updateGoalShared,
} from "@spine/shared";
import { supabase } from "./supabase";

export type { GoalListItem } from "@spine/shared";

export const loadGoals = () => loadGoalsShared(supabase);

export const loadGoalsForYear = (year: number) =>
  loadGoalsForYearShared(supabase, year);

export const setGoal = (opts: {
  userId: string;
  year: number;
  target: number;
  name?: string;
  isAuto?: boolean;
}) => setGoalShared(supabase, opts);

export const updateGoal = (
  id: string,
  patch: { target?: number; name?: string },
) => updateGoalShared(supabase, id, patch);

export const deleteGoal = (id: string) => deleteGoalShared(supabase, id);

export const addBookToGoal = (opts: {
  userId: string;
  goalId: string;
  bookId: string;
}) => addBookToGoalShared(supabase, opts);

export const removeBookFromGoal = (opts: { goalId: string; bookId: string }) =>
  removeBookFromGoalShared(supabase, opts);
