import { NextRequest, NextResponse, after } from "next/server";
import { createApiClient, getUserId } from "@/lib/supabase-server";
import { syncBookSeries } from "@/lib/seriesSync.server";
import { upsertBookForUser, flattenUserBook } from "@/lib/bookUpsert.server";

export async function GET(req: NextRequest) {
  const supabase = createApiClient(req);
  const userId = getUserId(req);
  if (!userId)
    return NextResponse.json(
      { error: "unauthorized", at: "route-get" },
      { status: 401 },
    );

  const { searchParams } = req.nextUrl;
  const year = searchParams.get("year");
  const limit = searchParams.get("limit");
  const offset = searchParams.get("offset");
  const sort = searchParams.get("order");
  const include = searchParams.get("include");

  // Only join thoughts/book_reads when explicitly requested (e.g. book detail page)
  const select =
    include === "nested"
      ? "*, catalog_books(*), thoughts(*), book_reads(*)"
      : "*, catalog_books(*)";

  let query = supabase.from("user_books").select(select).eq("user_id", userId);

  // apply sorting
  if (sort) {
    const [column, direction] = sort.split(".");

    query = query.order(column, {
      ascending: direction !== "desc",
      nullsFirst: false,
    });
  } else {
    query = query.order("updated_at", { ascending: false, nullsFirst: false });
  }

  if (year) {
    const y = Number(year);
    const start = `${y}-01-01`;
    const end = `${y + 1}-01-01`;
    query = query.or(
      `and(date_finished.gte.${start},date_finished.lt.${end}),` +
        `and(date_started.gte.${start},date_started.lt.${end}),` +
        `and(date_shelved.gte.${start},date_shelved.lt.${end}),` +
        `and(status.eq.want-to-read,created_at.gte.${start},created_at.lt.${end}),` +
        `and(status.eq.did-not-finish,date_shelved.is.null,updated_at.gte.${start},updated_at.lt.${end})`,
    );
  }

  if (limit) query = query.limit(Number(limit));
  if (offset)
    query = query.range(
      Number(offset),
      Number(offset) + Number(limit ?? 50) - 1,
    );

  const { data, error } = await query;
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  const flattened = (
    (data ?? []) as unknown as Parameters<typeof flattenUserBook>[0][]
  ).map(flattenUserBook);
  if (limit)
    return NextResponse.json({ data: flattened, total: flattened.length });
  return NextResponse.json(flattened);
}

export async function POST(req: NextRequest) {
  const supabase = createApiClient(req);
  const userId = getUserId(req);
  if (!userId)
    return NextResponse.json(
      { error: "unauthorized", at: "route-post" },
      { status: 401 },
    );

  const { entry } = await req.json();

  const result = await upsertBookForUser(
    supabase,
    userId,
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
      rating: entry.rating ?? 0,
      feeling: entry.feeling ?? "",
      bookmarked: false,
      diversity_tags: entry.diversityTags ?? [],
      created_at: entry.createdAt,
      updated_at: entry.updatedAt,
    },
  );

  if (!result)
    return NextResponse.json(
      { error: "failed to create book" },
      { status: 500 },
    );

  after(async () => {
    await syncBookSeries(supabase, userId, {
      id: result.userBookId,
      title: entry.title ?? "",
      author: entry.author ?? "",
      status: entry.status,
      coverUrl: entry.coverUrl ?? "",
    });
  });

  return NextResponse.json(
    { ok: true, id: result.userBookId },
    { status: 201 },
  );
}
