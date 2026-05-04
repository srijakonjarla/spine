/**
 * Thin re-exports of the shared query functions, pre-bound to the mobile
 * Supabase client. New query logic should live in `@spine/shared/queries`,
 * not here.
 */
import {
  createYearGoal as createYearGoalShared,
  loadHomeData as loadHomeDataShared,
  logProgress as logProgressShared,
  markBookFinished as markBookFinishedShared,
  type HomeData,
} from "@spine/shared";
import { supabase } from "./supabase";

export type {
  HomeData,
  HomeFinished,
  HomeGoal,
  HomeLogEntry,
  HomeReading,
} from "@spine/shared";

export const loadHomeData = (year: number) =>
  loadHomeDataShared(supabase, year);

export const markBookFinished = (userBookId: string) =>
  markBookFinishedShared(supabase, userBookId);

export const createYearGoal = (opts: {
  userId: string;
  year: number;
  target: number;
}) => createYearGoalShared(supabase, opts);

export const logProgress = (opts: {
  userId: string;
  pagesRead: number;
  note?: string;
}) => logProgressShared(supabase, opts);
