import { NextRequest, NextResponse } from "next/server";

const HC_ENDPOINT = "https://api.hardcover.app/v1/graphql";

interface HcEdition {
  id?: number;
  isbn_13?: string;
  isbn_10?: string;
  image?: { url?: string };
  publisher?: { name?: string } | null;
}

export interface EditionOption {
  id: number;
  coverUrl: string;
  isbn: string;
  publisher: string;
}

async function hcPost(query: string, variables: Record<string, unknown>) {
  const token = process.env.HARDCOVER_API_TOKEN;
  if (!token) return null;
  const res = await fetch(HC_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
    next: { revalidate: 60 },
  });
  if (!res.ok) return null;
  return res.json();
}

function parseEditions(editions: HcEdition[]): EditionOption[] {
  const seen = new Set<string>();
  return editions
    .filter((e) => e.image?.url && !seen.has(e.image!.url!) && seen.add(e.image!.url!))
    .map((e) => ({
      id: e.id ?? 0,
      coverUrl: e.image!.url!,
      isbn: e.isbn_13 || e.isbn_10 || "",
      publisher: e.publisher?.name ?? "",
    }));
}

const EDITIONS_BY_ISBN_QUERY = `
  query EditionsByIsbn($isbn: String!) {
    books(where: {
      _or: [
        { editions: { isbn_13: { _eq: $isbn } } },
        { editions: { isbn_10: { _eq: $isbn } } }
      ]
    }, limit: 1) {
      editions { id isbn_13 isbn_10 image { url } publisher { name } }
    }
  }
`;

const SEARCH_QUERY = `
  query SearchBook($query: String!) {
    search(query: $query, query_type: "Book", per_page: 5) {
      results
    }
  }
`;

const EDITIONS_BY_IDS_QUERY = `
  query EditionsByIds($ids: [Int!]!) {
    books(where: { id: { _in: $ids } }) {
      id
      editions { id isbn_13 isbn_10 image { url } publisher { name } }
    }
  }
`;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const isbn = searchParams.get("isbn") ?? "";
  const title = searchParams.get("title") ?? "";
  const author = searchParams.get("author") ?? "";

  if (isbn) {
    const json = await hcPost(EDITIONS_BY_ISBN_QUERY, { isbn });
    const editions: HcEdition[] = json?.data?.books?.[0]?.editions ?? [];
    if (editions.length)
      return NextResponse.json({ editions: parseEditions(editions) });
  }

  if (!title.trim()) return NextResponse.json({ editions: [] });

  const searchJson = await hcPost(SEARCH_QUERY, {
    query: [title, author].filter(Boolean).join(" "),
  });
  const raw = searchJson?.data?.search?.results;
  if (!raw) return NextResponse.json({ editions: [] });
  const parsed: { hits?: { document: { id?: number | string } }[] } =
    typeof raw === "string" ? JSON.parse(raw) : raw;
  const hitId = parsed?.hits?.[0]?.document?.id;
  const bookId = hitId !== undefined ? Number(hitId) : undefined;
  if (bookId === undefined || isNaN(bookId))
    return NextResponse.json({ editions: [] });

  const byIdsJson = await hcPost(EDITIONS_BY_IDS_QUERY, { ids: [bookId] });
  const editions: HcEdition[] = byIdsJson?.data?.books?.[0]?.editions ?? [];
  return NextResponse.json({ editions: parseEditions(editions) });
}
