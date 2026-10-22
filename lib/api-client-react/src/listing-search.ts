import type { Venue } from "./generated/api.schemas";

type SearchableListing = Pick<Venue, "name" | "description" | "tags" | "category"> & {
  neighborhood?: string | null;
};

// Generic words people add to a food search ("filipino food") that would
// otherwise exclude every listing whose text doesn't happen to contain them.
const FILLER_WORDS = new Set([
  "a", "an", "and", "the", "in", "of", "for", "near", "me", "best", "good",
  "food", "foods", "restaurant", "restaurants", "place", "places", "spot", "spots", "cuisine",
]);

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Same sound, common misspelling: "phillipino" for "filipino". Typo matching only. */
function soundAlike(word: string): string {
  return word.replace(/ph/g, "f");
}

/** Typos allowed for a query word: none for short words, which match too much. */
function maxTypos(length: number): number {
  if (length <= 3) return 0;
  if (length <= 6) return 1;
  return 2;
}

/** Edit distance counting adjacent swaps as one edit, capped at `max + 1`. */
function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prevPrev: number[] = [];
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let d = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d = Math.min(d, prevPrev[j - 2] + 1);
      }
      row.push(d);
      rowMin = Math.min(rowMin, d);
    }
    if (rowMin > max) return max + 1;
    prevPrev = prev;
    prev = row;
  }
  return prev[b.length];
}

function isTypoOf(queryWord: string, words: string[]): boolean {
  const q = soundAlike(queryWord);
  const max = maxTypos(q.length);
  if (max === 0) return false;
  // Compare against whole words and same-length prefixes, so a misspelled
  // partial word ("filipn") still finds "filipino" while the user is typing.
  return words.some((raw) => {
    const word = soundAlike(raw);
    return editDistance(q, word, max) <= max ||
      (word.length > q.length && editDistance(q, word.slice(0, q.length), max) <= max);
  });
}

/**
 * Builds a predicate for listings matching `query` in their name, description,
 * tags, category or neighborhood. Every meaningful query word must match.
 * A word is matched loosely (small typos allowed) only when it appears nowhere
 * in `listings`, so real words like "thai" never pick up "that" or "chai".
 */
export function createListingSearch<T extends SearchableListing>(
  listings: readonly T[],
  query: string,
): (listing: T) => boolean {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return () => true;

  const texts = new Map<T, string>();
  const textOf = (listing: T) => {
    let text = texts.get(listing);
    if (text === undefined) {
      text = normalize([
        listing.name,
        listing.description,
        ...listing.tags,
        listing.category,
        listing.neighborhood ?? "",
      ].join(" "));
      texts.set(listing, text);
    }
    return text;
  };

  const allWords = normalizedQuery.split(" ");
  const meaningful = allWords.filter((w) => !FILLER_WORDS.has(w));
  // A query made only of filler words ("food") is searched as typed.
  const required = meaningful.length > 0 ? meaningful : allWords;
  const typoWords = new Set(
    required.filter((w) => !listings.some((listing) => textOf(listing).includes(w))),
  );

  return (listing) => {
    const text = textOf(listing);
    // Whole-phrase matches keep exact searches like "lucky three" working as before.
    if (text.includes(normalizedQuery)) return true;
    const words = text.split(" ");
    return required.every((w) =>
      typoWords.has(w) ? isTypoOf(w, words) : text.includes(w));
  };
}
