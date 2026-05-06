/**
 * Canonical form for a mood tag — lowercase, trimmed, internal whitespace
 * runs collapsed to a single hyphen. Mirrors the Postgres trigger
 * `user_books_normalize_mood_tags_trg` so the API and DB never disagree.
 */
export function normalizeMoodTag(tag: string): string {
  return tag.trim().toLowerCase().replace(/\s+/g, "-");
}

/** Normalize, drop empties, dedupe, sort — matches the DB normalizer. */
export function normalizeMoodTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  const seen = new Set<string>();
  for (const t of tags) {
    if (typeof t !== "string") continue;
    const n = normalizeMoodTag(t);
    if (n) seen.add(n);
  }
  return Array.from(seen).sort();
}
