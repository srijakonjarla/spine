import {
  loadGoals as loadGoalsShared,
  setGoal as setGoalShared,
} from "@spine/shared";
import { supabase } from "./supabase";

export type { GoalListItem } from "@spine/shared";

export const loadGoals = () => loadGoalsShared(supabase);

export const setGoal = (opts: {
  userId: string;
  year: number;
  target: number;
  name?: string;
  isAuto?: boolean;
}) => setGoalShared(supabase, opts);
