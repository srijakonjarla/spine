import { NextRequest, NextResponse, after } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { syncBookSeries } from "@/lib/seriesSync.server";
import { upsertBookForUser, flattenUserBook } from "@/lib/bookUpsert.server";

export async function GET(req: NextRequest) {
  const supabase = createServerClient(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const year = searchParams.get("year");
  const limit = searchParams.get("limit");
  const offset = searchParams.get("offset");
  const sort = searchParams.get("order");

  let query = supabase
    .from("user_books")
    .select("*, catalog_books(*), thoughts(*), book_reads(*)")
    .eq("user_id", user.id);

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
      `and(created_at.gte.${start},created_at.lt.${end}),` +
        `and(date_finished.gte.${start},date_finished.lt.${end}),` +
        `and(date_started.gte.${start},date_started.lt.${end}),` +
        `and(date_shelved.gte.${start},date_shelved.lt.${end})`,
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

  const flattened = (data ?? []).map(flattenUserBook);
  if (limit)
    return NextResponse.json({ data: flattened, total: flattened.length });
  return NextResponse.json(flattened);
}

export async function POST(req: NextRequest) {
  const supabase = createServerClient(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { entry } = await req.json();

  const result = await upsertBookForUser(
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
      diversity_tags: entry.diversityTags ?? [],
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
    await syncBookSeries(supabase, user.id, {
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
