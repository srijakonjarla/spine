import { NextRequest, NextResponse } from "next/server";
import { createApiClient, getUserId } from "@/lib/supabase-server";
import {
  CATALOG_COLUMNS,
  USER_BOOK_COLUMNS,
  catalogFieldsFromEntry,
  flattenUserBook,
  personalFieldsFromEntry,
  upsertBookForUser,
} from "@/lib/bookUpsert.server";
import { STATUS_LABEL } from "@spine/shared";

export async function GET(req: NextRequest) {
  const supabase = createApiClient(req);
  const userId = getUserId(req);
  if (!userId)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const year = searchParams.get("year");
  const limit = searchParams.get("limit");
  const offset = searchParams.get("offset");
  const sort = searchParams.get("order");
  const include = searchParams.get("include");
  const status = searchParams.get("status");

  // Only join thoughts/book_reads when explicitly requested (e.g. book detail page)
  const select =
    include === "nested"
      ? `${USER_BOOK_COLUMNS}, catalog_books(${CATALOG_COLUMNS}), thoughts(*), book_reads(*)`
      : `${USER_BOOK_COLUMNS}, catalog_books(${CATALOG_COLUMNS})`;

  let query = supabase.from("user_books").select(select).eq("user_id", userId);

  if (status) query = query.eq("status", status);

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
        `and(date_dnfed.gte.${start},date_dnfed.lt.${end}),` +
        `and(status.eq.want-to-read,created_at.gte.${start},created_at.lt.${end})`,
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
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { entry } = await req.json();

  const result = await upsertBookForUser(
    supabase,
    userId,
    catalogFieldsFromEntry(entry),
    personalFieldsFromEntry(entry),
    { verified: false },
  );

  if (!result)
    return NextResponse.json(
      { error: "failed to create book" },
      { status: 500 },
    );

  if (result.alreadyExists && result.existingStatus !== entry.status) {
    const label =
      STATUS_LABEL[result.existingStatus ?? ""] ?? result.existingStatus;
    return NextResponse.json(
      { error: `"${entry.title}" is already in your library (${label}).` },
      { status: 409 },
    );
  }

  return NextResponse.json(
    { ok: true, id: result.userBookId },
    { status: 201 },
  );
}
