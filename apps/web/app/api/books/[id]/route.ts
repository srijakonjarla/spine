import { NextRequest, NextResponse, after } from "next/server";
import { createApiClient, getUserId } from "@/lib/supabase-server";
import { autoLogToday } from "@/lib/autoLog";
import { syncBookSeries } from "@/lib/seriesSync.server";
import { flattenUserBook } from "@/lib/bookUpsert.server";
import { normalizeMoodTags } from "@/lib/moodTags";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = createApiClient(req);
  const userId = getUserId(req);
  if (!userId) return NextResponse.json(null, { status: 401 });

  const { id } = await params;
  const { data, error } = await supabase
    .from("user_books")
    .select("*, catalog_books(*), thoughts(*), book_reads(*)")
    .eq("id", id)
    .eq("user_id", userId)
    .single();
  if (error || !data) return NextResponse.json(null, { status: 404 });
  return NextResponse.json(flattenUserBook(data));
}

// Fields the user can change that go to the shared catalog (improve it for everyone).
const CATALOG_FIELDS = new Set([
  "coverUrl",
  "isbn",
  "pageCount",
  "releaseDate",
  "genres",
]);
// Fields that become per-user overrides when edited.
const OVERRIDE_FIELDS = new Set(["title", "author"]);
// Fields that go directly on user_books.
const READING_ACTIVITY_FIELDS = new Set([
  "status",
  "dateStarted",
  "dateFinished",
  "rating",
  "feeling",
  "moodTags",
]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = createApiClient(req);
  const userId = getUserId(req);
  if (!userId)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const patch = await req.json();
  const now = new Date().toISOString();

  // Verify ownership and get the catalog_book_id
  const { data: ub } = await supabase
    .from("user_books")
    .select("id, catalog_book_id")
    .eq("id", id)
    .eq("user_id", userId)
    .single();
  if (!ub) return NextResponse.json({ error: "not found" }, { status: 404 });

  // ── Personal fields → user_books ──────────────────────────────────────────
  const userRow: Record<string, unknown> = { updated_at: now };
  if ("status" in patch) userRow.status = patch.status;
  if ("dateStarted" in patch) userRow.date_started = patch.dateStarted || null;
  if ("dateFinished" in patch)
    userRow.date_finished = patch.dateFinished || null;
  if ("dateShelved" in patch) userRow.date_shelved = patch.dateShelved || null;
  if ("rating" in patch) userRow.rating = patch.rating;
  if ("feeling" in patch) userRow.feeling = patch.feeling;
  if ("bookmarked" in patch) userRow.bookmarked = patch.bookmarked;
  if ("upNext" in patch) userRow.up_next = patch.upNext;
  if ("moodTags" in patch)
    userRow.mood_tags = normalizeMoodTags(patch.moodTags);
  if ("format" in patch) userRow.format = patch.format;
  if ("diversityTags" in patch) userRow.diversity_tags = patch.diversityTags;
  // Title and author become per-user overrides
  if ("title" in patch) userRow.title_override = patch.title || null;
  if ("author" in patch) userRow.author_override = patch.author || null;

  const { error: ubErr } = await supabase
    .from("user_books")
    .update(userRow)
    .eq("id", id)
    .eq("user_id", userId);
  if (ubErr)
    return NextResponse.json({ error: ubErr.message }, { status: 500 });

  // ── Catalog fields → catalog_books (shared, benefits all users) ───────────
  const catalogRow: Record<string, unknown> = {};
  if ("coverUrl" in patch) catalogRow.cover_url = patch.coverUrl;
  if ("pageCount" in patch) catalogRow.page_count = patch.pageCount;
  if ("releaseDate" in patch) catalogRow.release_date = patch.releaseDate;
  if ("genres" in patch) catalogRow.genres = patch.genres;
  if ("publisher" in patch) catalogRow.publisher = patch.publisher;
  if ("audioDurationMinutes" in patch)
    catalogRow.audio_duration_minutes = patch.audioDurationMinutes ?? null;
  // ISBN edits merge into the isbns[] array rather than replacing a singular column.
  if ("isbn" in patch && patch.isbn) {
    const { data: cb } = await supabase
      .from("catalog_books")
      .select("isbns")
      .eq("id", ub.catalog_book_id)
      .single();
    const stored = (cb?.isbns as string[] | null) ?? [];
    const merged = [...new Set([...stored, patch.isbn])];
    if (merged.length !== stored.length) catalogRow.isbns = merged;
  }

  if (Object.keys(catalogRow).length) {
    catalogRow.updated_at = now;
    await supabase
      .from("catalog_books")
      .update(catalogRow)
      .eq("id", ub.catalog_book_id);
  }

  const isReadingActivity = Object.keys(patch).some((k) =>
    READING_ACTIVITY_FIELDS.has(k),
  );
  if (isReadingActivity) await autoLogToday(supabase, userId);

  // When status changes to reading/finished, sync series membership
  if ("status" in patch && ["reading", "finished"].includes(patch.status)) {
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
        await syncBookSeries(supabase, userId, {
          id: book.id,
          title: book.title_override ?? cb?.title ?? "",
          author: book.author_override ?? cb?.author ?? "",
          status: book.status,
          coverUrl: cb?.cover_url ?? "",
        });
      }
    });
  }

  void CATALOG_FIELDS;
  void OVERRIDE_FIELDS; // consumed above
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = createApiClient(req);
  const userId = getUserId(req);
  if (!userId)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  // Deleting user_books cascades to thoughts, book_reads via FK
  const { error } = await supabase
    .from("user_books")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
