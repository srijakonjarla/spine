"use server";

import { createActionClient } from "@/lib/supabase-server";
import {
  catalogFieldsFromEntry,
  personalFieldsFromEntry,
  upsertBookForUser,
  userBookPatchFromEntry,
} from "@/lib/bookUpsert.server";
import { autoLogToday, autoLogDate } from "@/lib/autoLog";
import { serverTodayLocal } from "@/lib/serverDate";
import { STATUS_LABEL } from "@spine/shared";
import type { BookEntry, BookRead, Thought } from "@/types";

// ── Auth helper ────────────────────────────────────────────────────────────────

async function authed() {
  const supabase = await createActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");
  return { supabase, user };
}

// ── Books ──────────────────────────────────────────────────────────────────────

export async function createEntryAction(
  entry: BookEntry,
): Promise<{ id: string }> {
  const { supabase, user } = await authed();
  const result = await upsertBookForUser(
    supabase,
    user.id,
    catalogFieldsFromEntry(entry),
    personalFieldsFromEntry(entry),
    { verified: false },
  );
  if (!result) throw new Error("failed to create book");
  if (result.alreadyExists && result.existingStatus !== entry.status) {
    const label =
      STATUS_LABEL[result.existingStatus ?? ""] ?? result.existingStatus;
    throw new Error(`"${entry.title}" is already in your library (${label}).`);
  }
  return { id: result.userBookId };
}

export async function updateEntryAction(
  id: string,
  patch: Partial<BookEntry>,
): Promise<void> {
  const { supabase, user } = await authed();
  const { data: updated, error } = await supabase
    .from("user_books")
    .update({
      ...userBookPatchFromEntry(patch),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id");
  if (error) throw new Error(error.message);
  if (!updated?.length) throw new Error("not found");

  const READING_ACTIVITY = new Set([
    "status",
    "dateStarted",
    "dateFinished",
    "rating",
    "feeling",
  ]);
  if (Object.keys(patch).some((k) => READING_ACTIVITY.has(k))) {
    await autoLogToday(supabase, user.id);
  }
}

export async function deleteEntryAction(id: string): Promise<void> {
  const { supabase, user } = await authed();
  const { error } = await supabase
    .from("user_books")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
}

// ── Thoughts ───────────────────────────────────────────────────────────────────

export async function addThoughtAction(
  bookId: string,
  thought: Thought,
): Promise<void> {
  const { supabase, user } = await authed();
  const { error } = await supabase.rpc("add_thought", {
    p_id: thought.id,
    p_book_id: bookId,
    p_text: thought.text,
    p_created_at: thought.createdAt,
    p_page_number: thought.pageNumber ?? null,
  });
  if (error) throw new Error(error.message);

  // Log the reading day — if the thought is backdated, log that date too
  const thoughtDate = thought.createdAt.slice(0, 10); // "YYYY-MM-DD"
  const today = await serverTodayLocal();
  await autoLogToday(supabase, user.id);
  if (thoughtDate !== today) {
    await autoLogDate(supabase, user.id, thoughtDate);
  }
}

export async function removeThoughtAction(
  thoughtId: string,
  bookId: string,
): Promise<void> {
  const { supabase, user } = await authed();

  const { data: book } = await supabase
    .from("user_books")
    .select("id")
    .eq("id", bookId)
    .eq("user_id", user.id)
    .single();
  if (!book) throw new Error("not found");

  const { error } = await supabase.rpc("remove_thought", {
    p_thought_id: thoughtId,
    p_book_id: bookId,
  });
  if (error) throw new Error(error.message);
}

// ── Reads ──────────────────────────────────────────────────────────────────────

export async function startNewReadAction(entry: BookEntry): Promise<void> {
  const { supabase, user } = await authed();
  const { error } = await supabase.rpc("start_new_read", {
    p_book_id: entry.id,
    p_status: entry.status,
    p_date_started: entry.dateStarted || null,
    p_date_finished: entry.dateFinished || null,
    p_date_shelved: entry.dateShelved || null,
    p_date_dnfed: entry.dateDnfed || null,
    p_rating: entry.rating,
    p_feeling: entry.feeling,
    p_created_at: entry.createdAt,
  });
  if (error) throw new Error(error.message);
  await autoLogToday(supabase, user.id);
}

export async function deleteBookReadAction(readId: string): Promise<void> {
  const { supabase, user } = await authed();
  const { data: read } = await supabase
    .from("book_reads")
    .select("id")
    .eq("id", readId)
    .eq("user_id", user.id)
    .single();
  if (!read) throw new Error("not found");
  const { error } = await supabase.from("book_reads").delete().eq("id", readId);
  if (error) throw new Error(error.message);
}

export async function logHistoricalReadAction(
  bookId: string,
  read: {
    status: string;
    dateStarted: string;
    dateFinished: string;
    rating: number;
    feeling: string;
  },
): Promise<BookRead> {
  const { supabase, user } = await authed();
  const { data, error } = await supabase
    .from("book_reads")
    .insert({
      book_id: bookId,
      user_id: user.id,
      status: read.status ?? "finished",
      date_started: read.dateStarted || null,
      date_finished: read.dateFinished || null,
      date_shelved: null,
      date_dnfed: null,
      rating: read.rating ?? 0,
      feeling: read.feeling ?? "",
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return {
    id: data.id,
    bookId: data.book_id,
    status: data.status,
    dateStarted: data.date_started ?? "",
    dateFinished: data.date_finished ?? "",
    dateShelved: data.date_shelved ?? "",
    dateDnfed: data.date_dnfed ?? "",
    rating: data.rating,
    feeling: data.feeling,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function updateBookReadAction(
  readId: string,
  patch: {
    status: string;
    dateStarted: string;
    dateFinished: string;
    rating: number;
    feeling: string;
  },
): Promise<BookRead> {
  const { supabase, user } = await authed();
  const { data: existing } = await supabase
    .from("book_reads")
    .select("id")
    .eq("id", readId)
    .eq("user_id", user.id)
    .single();
  if (!existing) throw new Error("not found");

  const { data, error } = await supabase
    .from("book_reads")
    .update({
      status: patch.status ?? "finished",
      date_started: patch.dateStarted || null,
      date_finished: patch.dateFinished || null,
      date_shelved: null,
      date_dnfed: null,
      rating: patch.rating ?? 0,
      feeling: patch.feeling ?? "",
      updated_at: new Date().toISOString(),
    })
    .eq("id", readId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return {
    id: data.id,
    bookId: data.book_id,
    status: data.status,
    dateStarted: data.date_started ?? "",
    dateFinished: data.date_finished ?? "",
    dateShelved: data.date_shelved ?? "",
    dateDnfed: data.date_dnfed ?? "",
    rating: data.rating,
    feeling: data.feeling,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}
