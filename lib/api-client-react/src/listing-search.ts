import type { Venue } from "./generated/api.schemas";
import { KNOWN_PHRASES, knownSingleWordTerms, relatedTerms } from "./search-terms";

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

/** "tacos" → "taco", "pastries" → "pastry"; unchanged for short or non-plural words. */
function singular(word: string): string {
  if (word.length <= 3 || word.endsWith("ss")) return word;
  if (word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (/(ch|sh|x|ss)es$/.test(word)) return word.slice(0, -2);
  if (word.endsWith("s")) return word.slice(0, -1);
  return word;
}

/** Whole-word (or whole-phrase) match, allowing a plural "s"/"es" ending. */
function hasWord(paddedText: string, phrase: string): boolean {
  return [" ", "s ", "es "].some((end) => paddedText.includes(` ${phrase}${end}`));
}

/** Splits a query into terms, keeping known phrases like "dim sum" together. */
function queryTerms(normalizedQuery: string): string[] {
  const words = normalizedQuery.split(" ");
  const terms: string[] = [];
  for (let i = 0; i < words.length; i++) {
    const rest = words.slice(i).join(" ");
    const phrase = KNOWN_PHRASES.find((p) => rest === p || rest.startsWith(`${p} `));
    if (phrase) {
      terms.push(phrase);
      i += phrase.split(" ").length - 1;
    } else {
      terms.push(words[i]);
    }
  }
  return terms;
}

/** Other words that also satisfy `term`: its singular form and related terms. */
function alternativesFor(term: string): string[] {
  const base = singular(term);
  return [...new Set([base, ...relatedTerms(term), ...relatedTerms(base)])]
    .map(normalize)
    .filter((alt) => alt && alt !== term);
}

/**
 * Builds a predicate for listings matching `query` in their name, description,
 * tags, category or neighborhood. Every meaningful query term must match,
 * either as typed, as a related term ("noodles" also finds ramen and pho), or,
 * when it appears nowhere in `listings`, with small typos. Real words like
 * "thai" are never typo-matched, so they don't pick up "that" or "chai".
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

  const allTerms = queryTerms(normalizedQuery);
  const meaningful = allTerms.filter((t) => !FILLER_WORDS.has(t));
  // A query made only of filler words ("food") is searched as typed.
  const required = meaningful.length > 0 ? meaningful : allTerms;

  // The typed term matches anywhere (so "lump" finds "lumpia" while typing);
  // its alternatives must match whole words, so "masa" doesn't find "masala".
  const termMatches = (term: string, alternatives: string[], listing: T) => {
    const text = textOf(listing);
    if (text.includes(term)) return true;
    const padded = ` ${text} `;
    return alternatives.some((alt) => hasWord(padded, alt));
  };
  const anyListingMatches = (term: string, alternatives: string[]) =>
    listings.some((listing) => termMatches(term, alternatives, listing));

  const matchers = required.map((term): ((listing: T) => boolean) => {
    const alternatives = alternativesFor(term);
    if (anyListingMatches(term, alternatives)) {
      return (listing) => termMatches(term, alternatives, listing);
    }
    // Not in the directory as typed: maybe a misspelled known term ("noodels").
    const known = knownSingleWordTerms().find((k) => isTypoOf(term, [k]));
    if (known) {
      const knownAlternatives = alternativesFor(known);
      if (anyListingMatches(known, knownAlternatives)) {
        return (listing) => termMatches(known, knownAlternatives, listing);
      }
    }
    return (listing) => isTypoOf(term, textOf(listing).split(" "));
  });

  return (listing) => {
    // Whole-phrase matches keep exact searches like "lucky three" working as before.
    if (textOf(listing).includes(normalizedQuery)) return true;
    return matchers.every((matches) => matches(listing));
  };
}
