"use server";

import { after } from "next/server";
import { createActionClient } from "@/lib/supabase-server";
import { upsertBookForUser } from "@/lib/bookUpsert.server";
import { autoLogToday, autoLogDate } from "@/lib/autoLog";
import { syncBookSeries } from "@/lib/seriesSync.server";
import { normalizeMoodTags } from "@/lib/moodTags";
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

export async function createEntryAction(entry: BookEntry): Promise<void> {
  const { supabase, user } = await authed();
  await upsertBookForUser(
    supabase,
    user.id,
    {
      title: entry.title ?? "",
      author: entry.author ?? "",
      cover_url: entry.coverUrl ?? "",
      isbn: entry.isbn ?? "",
      release_date: entry.releaseDate ?? "",
      genres: entry.genres ?? [],
      page_count: entry.pageCount ?? null,
      publisher: entry.publisher ?? "",
      audio_duration_minutes: entry.audioDurationMinutes ?? null,
    },
    {
      id: entry.id,
      status: entry.status,
      date_started: entry.dateStarted || null,
      date_finished: entry.dateFinished || null,
      date_shelved: entry.dateShelved || null,
      date_dnfed: entry.dateDnfed || null,
      rating: entry.rating ?? 0,
      feeling: entry.feeling ?? "",
      bookmarked: false,
      diversity_tags: entry.diversityTags ?? [],
      created_at: entry.createdAt,
      updated_at: entry.updatedAt,
    },
  );
}

export async function updateEntryAction(
  id: string,
  patch: Partial<BookEntry>,
): Promise<void> {
  const { supabase, user } = await authed();
  const now = new Date().toISOString();

  const { data: ub } = await supabase
    .from("user_books")
    .select("id, catalog_book_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (!ub) throw new Error("not found");

  const userRow: Record<string, unknown> = { updated_at: now };
  if ("status" in patch) userRow.status = patch.status;
  if ("dateStarted" in patch) userRow.date_started = patch.dateStarted || null;
  if ("dateFinished" in patch)
    userRow.date_finished = patch.dateFinished || null;
  if ("dateShelved" in patch) userRow.date_shelved = patch.dateShelved || null;
  if ("dateDnfed" in patch) userRow.date_dnfed = patch.dateDnfed || null;
  if ("rating" in patch) userRow.rating = patch.rating;
  if ("feeling" in patch) userRow.feeling = patch.feeling;
  if ("bookmarked" in patch) userRow.bookmarked = patch.bookmarked;
  if ("upNext" in patch) userRow.up_next = patch.upNext;
  if ("moodTags" in patch)
    userRow.mood_tags = normalizeMoodTags(patch.moodTags);
  if ("diversityTags" in patch) userRow.diversity_tags = patch.diversityTags;
  if ("bookshelves" in patch) userRow.bookshelves = patch.bookshelves;
  if ("userGenres" in patch) userRow.user_genres = patch.userGenres;
  if ("format" in patch) userRow.format = patch.format;
  if ("title" in patch) userRow.title_override = patch.title || null;
  if ("author" in patch) userRow.author_override = patch.author || null;

  const { error: ubErr } = await supabase
    .from("user_books")
    .update(userRow)
    .eq("id", id)
    .eq("user_id", user.id);
  if (ubErr) throw new Error(ubErr.message);

  const catalogRow: Record<string, unknown> = {};
  if ("coverUrl" in patch) catalogRow.cover_url = patch.coverUrl;
  if ("pageCount" in patch) catalogRow.page_count = patch.pageCount;
  if ("releaseDate" in patch) catalogRow.release_date = patch.releaseDate;
  if ("genres" in patch) catalogRow.genres = patch.genres;
  if ("publisher" in patch) catalogRow.publisher = patch.publisher;
  if ("audioDurationMinutes" in patch)
    catalogRow.audio_duration_minutes = patch.audioDurationMinutes ?? null;
  if ("isbn" in patch && patch.isbn) {
    const { data: cb } = await supabase
      .from("catalog_books")
      .select("isbns")
      .eq("id", ub.catalog_book_id)
      .single();
    const stored = (cb?.isbns as string[] | null) ?? [];
    const merged = [...new Set([...stored, patch.isbn as string])];
    if (merged.length !== stored.length) catalogRow.isbns = merged;
  }

  if (Object.keys(catalogRow).length) {
    catalogRow.updated_at = now;
    await supabase
      .from("catalog_books")
      .update(catalogRow)
      .eq("id", ub.catalog_book_id);
  }

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

  if ("status" in patch && ["reading", "finished"].includes(patch.status!)) {
    after(async () => {
      const { data: book } = await supabase
        .from("user_books")
        .select(
          "id, status, title_override, author_override, catalog_books(title, author, cover_url)",
        )
        .eq("id", id)
        .single();
      if (book) {
        const cb = book.catalog_books as unknown as {
          title: string;
          author: string;
          cover_url: string;
        } | null;
        await syncBookSeries(supabase, user.id, {
          id: book.id,
          title: book.title_override ?? cb?.title ?? "",
          author: book.author_override ?? cb?.author ?? "",
          status: book.status,
          coverUrl: cb?.cover_url ?? "",
        });
      }
    });
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
  const today = new Date().toISOString().slice(0, 10);
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
