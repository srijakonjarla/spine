import type { BookEntry } from "./types";

/**
 * Canonical genres for filtering. Catalog genres come from Hardcover and older
 * imports and are noisy: moods ("emotional"), subject headings ("Boston
 * (Mass.)"), shelf names ("Read 2024"), and many spellings of the same genre.
 * Each catalog value is mapped onto this list, and anything that doesn't map
 * is left out of filters.
 *
 * Keys are normalized (see `genreKey`): lowercase, "&" → "and", punctuation
 * dropped, CamelCase split.
 */
// prettier-ignore
const GENRE_ALIASES: Record<string, string[]> = {
  Fiction: ["fiction", "ficiton", "novel", "genre fiction", "fiction and literature", "literature and fiction"],
  "Literary Fiction": ["literary fiction", "literary", "literature", "american literature", "philosophical fiction"],
  Adult: ["adult", "adult fiction"],
  "Young Adult": ["young adult", "young adult fiction", "teen and young adult", "teen", "jeune adulte", "young adult nonfiction"],
  "New Adult": ["new adult"],
  "Middle Grade": ["middle grade"],
  "Children's": ["children", "childrens", "childrens literature", "childrens stories", "childrens audiobooks", "juvenile fiction", "juvenile nonfiction"],
  Fantasy: ["fantasy", "magic", "high fantasy", "urban fantasy", "dark fantasy", "historical fantasy", "cozy fantasy", "epic fantasy"],
  Romantasy: ["romantasy", "fantasy romance"],
  Romance: ["romance", "romance fiction", "romance stories"],
  "Romantic Comedy": ["romantic comedy", "romcom", "rom com", "commedia romantica"],
  Erotica: ["erotica", "erotic stories", "erotic romance"],
  "Science Fiction": ["science fiction", "scifi", "sci fi", "hard science fiction", "space", "cyberpunk", "aliens", "time travel"],
  Dystopian: ["dystopian", "dystopia"],
  Mystery: ["mystery", "detective", "detective and mystery stories", "mystery and detective", "women sleuths", "police procedurals", "cozy mystery", "cosy mystery", "cold cases criminal investigation"],
  Thriller: ["thriller", "thrillers", "suspense", "psychological thriller", "crime thrillers", "romantic suspense"],
  Crime: ["crime", "crime fiction", "murder", "mafia", "crime and criminology"],
  Horror: ["horror", "gothic horror", "horror tales", "terror", "haunted houses"],
  Gothic: ["gothic", "gothic fiction literary genre", "gothic novels"],
  Paranormal: ["paranormal", "supernatural", "vampires", "occult", "witchcraft", "paranormal romance"],
  Contemporary: ["contemporary", "contemporary fiction", "realistic fiction", "contemporaneo"],
  "Historical Fiction": ["historical fiction", "historical", "regency", "alternative history"],
  Classics: ["classics", "classic"],
  Humor: ["humor", "humour", "comedy", "humorous fiction", "satire", "black humor"],
  "LGBTQ+": ["lgbtq", "lgbt", "lgbtqia", "queer", "sapphic", "lesbians", "bisexuals", "boys love"],
  "Graphic Novels": ["graphic novels", "comics", "manga", "comics and graphic novels"],
  Poetry: ["poetry"],
  "Short Stories": ["short stories", "literary collections"],
  Adventure: ["adventure", "action and adventure", "adventure and adventurers", "sea stories"],
  "Magical Realism": ["magical realism"],
  "Dark Academia": ["dark academia"],
  "Coming of Age": ["coming of age", "bildungsromans"],
  "Women's Fiction": ["womens fiction", "chick lit", "roman feminin", "narrativa femenina"],
  "Mythology & Retellings": ["mythology", "retellings", "fairy tales", "folk tales and myths"],
  Nonfiction: ["nonfiction", "non fiction"],
  "Biography & Memoir": ["biography", "autobiography", "memoir", "memoirs", "biographies and memoirs", "biography and autobiography", "diaries"],
  History: ["history"],
  Philosophy: ["philosophy"],
  Psychology: ["psychology", "mental health"],
  "Self-Help": ["self help", "personal development", "personal success"],
  Business: ["business", "economics", "business and economics", "business and careers"],
  Science: ["science", "technology", "computers"],
  "Politics & Society": ["politics", "political", "political science", "current affairs", "social science", "sociology", "civil rights and liberties"],
  Religion: ["religion", "christian", "religious", "spirituality"],
  Travel: ["travel"],
};

// Subgenres not listed above fall back to their parent by suffix,
// e.g. "Hockey Romance" → Romance, "Psychological Mystery" → Mystery.
const SUFFIX_PARENTS: [string, string][] = [
  [" romance", "Romance"],
  [" fantasy", "Fantasy"],
  [" science fiction", "Science Fiction"],
  [" mystery", "Mystery"],
  [" thriller", "Thriller"],
  [" horror", "Horror"],
];

const ALIAS_INDEX = new Map<string, string>();
for (const [genre, keys] of Object.entries(GENRE_ALIASES)) {
  for (const k of keys) ALIAS_INDEX.set(k, genre);
}

/** Normalized lookup key for a raw genre string. */
export function genreKey(raw: string): string {
  return raw
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function lookup(raw: string): string | null {
  const key = genreKey(raw);
  if (!key) return null;
  const direct = ALIAS_INDEX.get(key);
  if (direct) return direct;
  for (const [suffix, parent] of SUFFIX_PARENTS) {
    if (key.endsWith(suffix)) return parent;
  }
  return null;
}

/**
 * Canonical genres for one raw value; empty if it isn't a recognized genre.
 * Compound values like "Science Fiction & Fantasy" or "Romance; Young Adult"
 * map each part, unless the whole value is itself a known alias.
 */
export function canonicalGenres(raw: string): string[] {
  const direct = ALIAS_INDEX.get(genreKey(raw));
  if (direct) return [direct];
  const parts = raw.split(/\s*(?:[|;/:]|->|\s&\s)\s*/).filter(Boolean);
  if (parts.length <= 1) {
    const g = lookup(raw);
    return g ? [g] : [];
  }
  return [...new Set(parts.map(lookup).filter((g): g is string => !!g))];
}

/**
 * Clean genres for a book: catalog genres mapped onto the canonical list,
 * plus the reader's own genres (kept as typed when they don't map).
 */
export function bookGenres(
  b: Pick<BookEntry, "genres" | "userGenres">,
): string[] {
  const out = new Set<string>();
  const user = new Set(b.userGenres ?? []);
  for (const raw of b.genres ?? []) {
    if (!user.has(raw)) canonicalGenres(raw).forEach((g) => out.add(g));
  }
  for (const raw of user) {
    const mapped = canonicalGenres(raw);
    if (mapped.length > 0) mapped.forEach((g) => out.add(g));
    else if (raw.trim()) out.add(raw.trim());
  }
  return [...out];
}
