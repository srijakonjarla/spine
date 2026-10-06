import { NextRequest, NextResponse, after } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createAdminClient,
  createApiClient,
  getUserId,
} from "@/lib/supabase-server";
import { parseGoodreadsCSV } from "@/lib/goodreads";
import { upsertBookForUser } from "@/lib/bookUpsert.server";
import {
  type HCBook,
  type RawHCBook,
  authorLastName,
  docId,
  fetchBooksByIds,
  fetchBooksByIsbns,
  normTitle,
  parseBookRow,
  parseSearchDoc,
  searchDocs,
  sleep,
  stripTitle,
  titlesMatch,
} from "@/lib/hardcover.server";

const DELAY_MS = 1100;
// Hardcover allows ~60 requests/min; title searches are one request each.
const SEARCH_DELAY_MS = 1000;
const BATCH_SIZE = 10;

/**
 * Validate that a HC result actually matches the Goodreads title + author.
 * Returns the matching book or null.
 */
function bestMatchFromBooks(
  books: RawHCBook[],
  titleHint: string,
  authorHint: string,
  fallbackIsbn = "",
): HCBook | null {
  if (!books.length) return null;
  const lastName = (s: string) => {
    const tokens = normTitle(s).match(/[a-z0-9]+/g) ?? [];
    return tokens[tokens.length - 1] ?? normTitle(s);
  };
  const hintLast = lastName(authorHint);

  for (const book of books) {
    if (!book.title) continue;
    if (!titlesMatch(book.title, titleHint)) continue;

    if (authorHint && book.contributions?.length) {
      const authorOk =
        hintLast.length < 3 ||
        book.contributions.some((c) => {
          const an = normTitle(c.author.name);
          return (
            lastName(c.author.name) === hintLast ||
            an.includes(normTitle(authorHint)) ||
            normTitle(authorHint).includes(an)
          );
        });
      if (!authorOk) continue;
    }

    const parsed = parseBookRow(book, fallbackIsbn);
    if (!parsed) continue;
    // If the primary match has no audio but a sibling hit (same title) does,
    // borrow the sibling's audio_seconds. HC sometimes has duplicate book rows
    // where only one has default_audio_edition populated.
    if (parsed.audioDurationMinutes == null) {
      for (const sibling of books) {
        if (sibling === book) continue;
        if (!titlesMatch(sibling.title ?? "", titleHint)) continue;
        const sib =
          sibling.default_audio_edition?.audio_seconds ??
          sibling.editions?.find((e) => (e.audio_seconds ?? 0) > 0)
            ?.audio_seconds ??
          null;
        if (sib != null && sib > 0) {
          parsed.audioDurationMinutes = Math.round(sib / 60);
          break;
        }
      }
    }
    return parsed;
  }
  return null;
}

/**
 * Look up a batch of Goodreads rows on Hardcover: one request for every ISBN
 * in the batch, one search per row without an ISBN, and one follow-up to
 * hydrate search hits. Each request has a single top-level field — Hardcover
 * rejects (403) queries with more top-level fields than its burst limit.
 */
async function fetchHCBatch(
  previews: ReturnType<typeof parseGoodreadsCSV>,
): Promise<(HCBook | null)[]> {
  const byIsbn =
    (await fetchBooksByIsbns(
      previews.map((p) => p.isbn),
      { logPrefix: "[import]" },
    )) ?? new Map<string, RawHCBook[]>();

  // Search hits are thin documents (no editions, no cached_tags, year-only
  // date); remember their ids to hydrate them with full book rows below.
  const enrichmentTargets: { idx: number; bookId: number }[] = [];
  const results: (HCBook | null)[] = [];

  for (const [i, { entry, isbn }] of previews.entries()) {
    if (isbn) {
      const books = byIsbn.get(isbn) ?? [];
      const result = bestMatchFromBooks(books, entry.title, entry.author, isbn);
      console.log(
        `[import] ISBN="${isbn}" "${entry.title}" → ${result ? `matched "${result.title}"` : `no match (${books.map((b) => b.title).join(", ") || "empty"})`}`,
      );
      results.push(result);
      continue;
    }

    // HC titles don't include series info; the suffix breaks search results.
    const baseTitle = stripTitle(entry.title);
    const lastName = authorLastName(entry.author);
    const hits =
      (await searchDocs(lastName ? `${baseTitle} ${lastName}` : baseTitle, 3, {
        logPrefix: "[import]",
      })) ?? [];
    await sleep(SEARCH_DELAY_MS);

    const hintLast = normTitle(lastName);
    const doc = hits.find(
      (d) =>
        d.title &&
        titlesMatch(d.title, entry.title) &&
        (hintLast.length < 3 ||
          !d.author_names?.length ||
          d.author_names.some((a) => normTitle(a).includes(hintLast))),
    );
    console.log(
      `[import] search "${entry.title}" → ${doc ? `matched "${doc.title}"` : `no match among ${hits.length} hit(s)`}`,
    );
    if (!doc) {
      results.push(null);
      continue;
    }
    results.push(parseSearchDoc(doc, isbn));
    const hcId = docId(doc);
    if (hcId != null) enrichmentTargets.push({ idx: i, bookId: hcId });
  }

  if (enrichmentTargets.length) {
    const full =
      (await fetchBooksByIds(
        enrichmentTargets.map((t) => t.bookId),
        { logPrefix: "[import]" },
      )) ?? new Map<number, HCBook>();
    for (const { idx, bookId } of enrichmentTargets) {
      const parsed = full.get(bookId);
      const existing = results[idx];
      if (!parsed || !existing) continue;
      results[idx] = {
        ...parsed,
        title: existing.title,
        author: existing.author,
        isbns: parsed.isbns.length ? parsed.isbns : existing.isbns,
        isbn: existing.isbn || parsed.isbn,
        genres: parsed.genres.length ? parsed.genres : existing.genres,
        pageCount: existing.pageCount ?? parsed.pageCount,
        releaseDate: parsed.releaseDate || existing.releaseDate,
        coverUrl: existing.coverUrl || parsed.coverUrl,
        audioDurationMinutes:
          parsed.audioDurationMinutes ?? existing.audioDurationMinutes,
        publisher: parsed.publisher || existing.publisher,
      };
    }
  }

  return results;
}

/**
 * Write `goodreads_import` progress into user_metadata via the service-role
 * admin API. Read-modify-write so we preserve other keys (e.g.
 * `goodreads_imported`) — `updateUserById` replaces user_metadata wholesale.
 */
async function setProgress(
  admin: SupabaseClient,
  userId: string,
  data: object,
) {
  const { data: u } = await admin.auth.admin.getUserById(userId);
  const meta = (u?.user?.user_metadata ?? {}) as Record<string, unknown>;
  meta.goodreads_import = data;
  await admin.auth.admin.updateUserById(userId, { user_metadata: meta });
}

async function runImport(
  supabase: SupabaseClient,
  userId: string,
  previews: ReturnType<typeof parseGoodreadsCSV>,
) {
  const total = previews.length;
  console.log(`[import] Starting for user ${userId}, ${total} books`);

  for (let batchStart = 0; batchStart < total; batchStart += BATCH_SIZE) {
    const batch = previews.slice(batchStart, batchStart + BATCH_SIZE);
    await setProgress(supabase, userId, {
      status: "running",
      total,
      processed: batchStart,
    });
    console.log(
      `[import] Batch HC lookup ${batchStart + 1}–${batchStart + batch.length}/${total}`,
    );

    const hcResults = await fetchHCBatch(batch);

    for (let j = 0; j < batch.length; j++) {
      const { entry, isbn } = batch[j];
      const hc = hcResults[j];
      const i = batchStart + j;

      console.log(
        `[import] DB write ${i + 1}/${total}: "${entry.title}" hc=${hc ? "hit" : "miss"}`,
      );

      // Only accept Hardcover's data if its title legitimately matches the
      // Goodreads title. Hardcover can return the wrong book for a foreign-
      // edition ISBN or a boxed-set ISBN. Goodreads is the source of truth
      // for what the user actually shelved.
      const hcTitleOk = !hc?.title || titlesMatch(hc.title, entry.title);
      if (hc?.title && !hcTitleOk) {
        console.log(
          `[import] Title mismatch — dropping Hardcover data for "${hc.title}", keeping Goodreads entry "${entry.title}"`,
        );
      }
      const safeHc = hcTitleOk ? hc : null;
      // If HC returned a bundle/translation for an ISBN lookup, drop the
      // CSV ISBN so it isn't merged onto a single-volume catalog row.
      const isHcRejection = !!hc?.title && !hcTitleOk;
      const resolvedTitle = stripTitle(safeHc?.title || entry.title);
      const resolvedAuthor = entry.author || safeHc?.author || "";
      const resolvedIsbn = isHcRejection ? "" : isbn || safeHc?.isbn || "";
      const coverUrl = safeHc?.coverUrl ?? "";
      const pageCount = safeHc?.pageCount ?? null;
      const releaseDate = safeHc?.releaseDate ?? "";
      const audioDurationMinutes = safeHc?.audioDurationMinutes ?? null;
      const publisher = safeHc?.publisher ?? "";
      // Genres come exclusively from Hardcover — Goodreads "genres" are the
      // user's custom bookshelves (e.g. "favorites", "my-2024-reads") and
      // should never be stored as catalog genre metadata.
      const genres = safeHc?.genres ?? [];

      const result = await upsertBookForUser(
        supabase,
        userId,
        {
          hardcover_book_id: safeHc?.hardcoverBookId ?? null,
          title: resolvedTitle,
          author: resolvedAuthor,
          cover_url: coverUrl,
          isbns: safeHc?.isbns.length
            ? safeHc.isbns
            : resolvedIsbn
              ? [resolvedIsbn]
              : [],
          release_date: releaseDate,
          genres,
          page_count: pageCount,
          publisher,
          audio_duration_minutes: audioDurationMinutes,
        },
        {
          id: crypto.randomUUID(),
          status: entry.status,
          date_started: entry.dateStarted || null,
          date_finished: entry.dateFinished || null,
          date_shelved: entry.dateShelved || null,
          date_dnfed: entry.dateDnfed || null,
          rating: entry.rating,
          feeling: entry.feeling,
          bookshelves: entry.genres,
          bookmarked: false,
          created_at: entry.createdAt,
          updated_at: entry.updatedAt,
        },
        { verified: true },
      );

      if (result?.alreadyExists) {
        const { data: existing } = await supabase
          .from("user_books")
          .select("id, status, date_finished, date_dnfed")
          .eq("id", result.userBookId)
          .single();
        if (!existing) continue;

        // Upgrade status if Goodreads has a higher-priority status than what's
        // stored. This handles books manually shelved as TBR before the import
        // that Goodreads knows as finished/reading.
        // Priority: finished > reading > did-not-finish > want-to-read
        const STATUS_PRIORITY: Record<string, number> = {
          finished: 4,
          reading: 3,
          "did-not-finish": 2,
          "want-to-read": 1,
        };
        const incomingPriority = STATUS_PRIORITY[entry.status] ?? 0;
        const existingPriority = STATUS_PRIORITY[existing.status] ?? 0;
        const userBookPatch: Record<string, unknown> = {
          updated_at: new Date().toISOString(),
        };
        if (incomingPriority > existingPriority) {
          userBookPatch.status = entry.status;
          userBookPatch.date_started = entry.dateStarted || null;
          userBookPatch.date_finished = entry.dateFinished || null;
          userBookPatch.date_shelved = entry.dateShelved || null;
          userBookPatch.date_dnfed = entry.dateDnfed || null;
          if (entry.rating) userBookPatch.rating = entry.rating;
          if (entry.feeling) userBookPatch.feeling = entry.feeling;
        }
        if (entry.genres.length) userBookPatch.bookshelves = entry.genres;
        if (Object.keys(userBookPatch).length > 1) {
          await supabase
            .from("user_books")
            .update(userBookPatch)
            .eq("id", existing.id);
        }

        // Add a new book_reads row if this is a distinct re-read
        if (
          entry.status === "finished" &&
          entry.dateFinished &&
          entry.dateFinished !== existing.date_finished
        ) {
          const { data: reads } = await supabase
            .from("book_reads")
            .select("status, date_finished")
            .eq("book_id", existing.id);
          const alreadyLogged = (reads ?? []).some(
            (r: { status: string; date_finished: string | null }) =>
              r.status === "finished" && r.date_finished === entry.dateFinished,
          );
          if (!alreadyLogged) {
            await supabase.from("book_reads").insert({
              book_id: existing.id,
              user_id: userId,
              status: entry.status,
              date_started: entry.dateStarted || null,
              date_finished: entry.dateFinished || null,
              date_shelved: null,
              rating: entry.rating,
              feeling: entry.feeling,
              created_at: entry.createdAt,
              updated_at: entry.updatedAt,
            });
          }
        } else if (
          entry.status === "did-not-finish" &&
          entry.dateDnfed &&
          entry.dateDnfed !== existing.date_dnfed
        ) {
          const { data: reads } = await supabase
            .from("book_reads")
            .select("status, date_dnfed")
            .eq("book_id", existing.id);
          const alreadyLogged = (reads ?? []).some(
            (r: { status: string; date_dnfed: string | null }) =>
              r.status === "did-not-finish" && r.date_dnfed === entry.dateDnfed,
          );
          if (!alreadyLogged) {
            await supabase.from("book_reads").insert({
              book_id: existing.id,
              user_id: userId,
              status: entry.status,
              date_started: entry.dateStarted || null,
              date_finished: null,
              date_shelved: null,
              date_dnfed: entry.dateDnfed || null,
              rating: entry.rating,
              feeling: entry.feeling,
              created_at: entry.createdAt,
              updated_at: entry.updatedAt,
            });
          }
        }
      }
    }

    await sleep(DELAY_MS);
  }

  console.log(`[import] Complete for user ${userId}, ${total} books`);
  // Combined final write: progress=done + goodreads_imported=true, preserving
  // other user_metadata keys.
  const { data: u } = await supabase.auth.admin.getUserById(userId);
  const meta = (u?.user?.user_metadata ?? {}) as Record<string, unknown>;
  meta.goodreads_import = { status: "done", total, processed: total };
  meta.goodreads_imported = true;
  await supabase.auth.admin.updateUserById(userId, { user_metadata: meta });
}

export async function GET(req: NextRequest) {
  const supabase = createApiClient(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const progress = user.user_metadata?.goodreads_import ?? {
    status: "idle",
    total: 0,
    processed: 0,
  };
  return NextResponse.json(progress);
}

export async function POST(req: NextRequest) {
  const supabase = createApiClient(req);
  const userId = getUserId(req);
  if (!userId)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { csv } = await req.json();
  if (!csv?.trim())
    return NextResponse.json({ error: "csv required" }, { status: 400 });

  const previews = parseGoodreadsCSV(csv);
  if (!previews.length)
    return NextResponse.json({ error: "no books found" }, { status: 400 });

  console.log(
    `[import] POST received, ${previews.length} books, user ${userId}`,
  );

  // Use the service-role admin client for the background job — the user's
  // session JWT would expire mid-run for large imports.
  const admin = createAdminClient();
  await setProgress(admin, userId, {
    status: "running",
    total: previews.length,
    processed: 0,
  });

  after(async () => {
    await runImport(admin, userId, previews);
  });

  return NextResponse.json({ started: true, total: previews.length });
}
