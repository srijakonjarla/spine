import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DNF_SHELVES = new Set([
  "did-not-finish", "dnf", "abandoned", "gave-up",
  "could-not-finish", "stopped", "unfinished",
]);

interface ImportEntry {
  title: string;
  author: string;
  genres: string[];
  status: string;
  dateStarted: string;
  dateFinished: string;
  dateShelved: string;
  rating: number;
  feeling: string;
  createdAt: string;
  updatedAt: string;
}

async function processEntry(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  entry: ImportEntry
): Promise<void> {
  // Look for an existing book row by title + author
  const { data: existing } = await supabase
    .from("books")
    .select("id, status, date_finished, date_shelved, book_reads(id, status, date_finished, date_shelved)")
    .eq("user_id", userId)
    .ilike("title", entry.title)
    .ilike("author", entry.author || "%")
    .maybeSingle();

  if (!existing) {
    await supabase.from("books").insert({
      id: crypto.randomUUID(),
      user_id: userId,
      title: entry.title,
      author: entry.author ?? "",
      release_date: "",
      genres: entry.genres ?? [],
      status: entry.status,
      date_started: entry.dateStarted || null,
      date_finished: entry.dateFinished || null,
      date_shelved: entry.dateShelved || null,
      rating: entry.rating,
      feeling: entry.feeling,
      bookmarked: false,
      created_at: entry.createdAt,
      updated_at: entry.updatedAt,
    });
    return;
  }

  // Finished re-read
  if (entry.status === "finished" && entry.dateFinished !== existing.date_finished) {
    const reads = (existing.book_reads ?? []) as { status: string; date_finished: string | null }[];
    const alreadyLogged = reads.some((r) => r.status === "finished" && r.date_finished === entry.dateFinished);
    if (!alreadyLogged) {
      await supabase.from("book_reads").insert({
        book_id: existing.id,
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
    return;
  }

  // DNF re-shelve
  if (entry.status === "did-not-finish" && entry.dateShelved !== existing.date_shelved) {
    const reads = (existing.book_reads ?? []) as { status: string; date_shelved: string | null }[];
    const alreadyLogged = reads.some((r) => r.status === "did-not-finish" && r.date_shelved === entry.dateShelved);
    if (!alreadyLogged) {
      await supabase.from("book_reads").insert({
        book_id: existing.id,
        status: entry.status,
        date_started: entry.dateStarted || null,
        date_finished: null,
        date_shelved: entry.dateShelved || null,
        rating: entry.rating,
        feeling: entry.feeling,
        created_at: entry.createdAt,
        updated_at: entry.updatedAt,
      });
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response("Unauthorized", { status: 401, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    const { entries }: { entries: ImportEntry[] } = await req.json();

    const BATCH = 5;
    for (let i = 0; i < entries.length; i += BATCH) {
      await Promise.allSettled(
        entries.slice(i, i + BATCH).map((e) => processEntry(supabase, user.id, e))
      );
      // Pause between batches to stay within rate limits
      if (i + BATCH < entries.length) {
        await new Promise((r) => setTimeout(r, 200));
      }
    }

    await supabase.auth.updateUser({ data: { goodreads_imported: true } });

    return new Response(JSON.stringify({ ok: true, count: entries.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
