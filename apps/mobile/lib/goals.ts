import { loadGoals as loadGoalsShared } from "@spine/shared";
import { supabase } from "./supabase";

export type { GoalListItem } from "@spine/shared";

export const loadGoals = () => loadGoalsShared(supabase);
