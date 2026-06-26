import {
  loadReadingLog,
  setLogNote,
  toggleLogEntry,
  type ReadingLogEntry,
} from "@spine/shared";
import { supabase } from "./supabase";

async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("not signed in");
  return data.user.id;
}

export async function getReadingLog(year: number): Promise<ReadingLogEntry[]> {
  return loadReadingLog(supabase, year);
}

export async function toggleDay(date: string): Promise<"added" | "removed"> {
  const userId = await currentUserId();
  return toggleLogEntry(supabase, { userId, date });
}

export async function saveLogNote(date: string, note: string): Promise<void> {
  const userId = await currentUserId();
  await setLogNote(supabase, { userId, date, note });
}
