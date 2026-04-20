import { apiFetch } from "@/lib/api";

export interface Recommendation {
  id: string;
  title: string;
  author: string;
  recommendedBy: string;
  notes: string;
  direction: "incoming" | "outgoing";
  bookId: string | null;
  createdAt: string;
}

interface RecommendationRow {
  id: string;
  title: string;
  author: string;
  recommended_by: string;
  notes: string;
  direction: string;
  book_id: string | null;
  created_at: string;
}

function mapRec(row: RecommendationRow): Recommendation {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    recommendedBy: row.recommended_by,
    notes: row.notes,
    direction: row.direction as "incoming" | "outgoing",
    bookId: row.book_id,
    createdAt: row.created_at,
  };
}

export async function getRecommendations(): Promise<Recommendation[]> {
  const res = await apiFetch("/api/recommendations");
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return (data as RecommendationRow[]).map(mapRec);
}

export async function createRecommendation(rec: {
  title: string;
  author?: string;
  recommendedBy?: string;
  notes?: string;
  direction?: "incoming" | "outgoing";
}): Promise<Recommendation> {
  const res = await apiFetch("/api/recommendations", {
    method: "POST",
    body: JSON.stringify({
      title: rec.title,
      author: rec.author ?? "",
      recommended_by: rec.recommendedBy ?? "",
      notes: rec.notes ?? "",
      direction: rec.direction ?? "incoming",
    }),
  });
  return mapRec(await res.json());
}

export async function deleteRecommendation(id: string): Promise<void> {
  await apiFetch(`/api/recommendations/${id}`, { method: "DELETE" });
}
