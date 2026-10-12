// Pure helpers shared by the homepage wheel and its editors. No imports, so
// node tests can transpile and execute this file directly.

export const PRICE_TIERS = ["$", "$$", "$$$", "$$$$"] as const;
export type PriceTier = (typeof PRICE_TIERS)[number];
export type PriceFilter = "any" | PriceTier;

export const PRICE_FILTER_OPTIONS: { id: PriceFilter; label: string }[] = [
  { id: "any", label: "Any price" },
  ...PRICE_TIERS.map((tier) => ({ id: tier as PriceFilter, label: tier })),
];

/** Exact stored-tier matching: "$$" only matches venues stored as "$$". */
export function matchesPriceTier(priceRange: string | null | undefined, filter: PriceFilter): boolean {
  return filter === "any" || priceRange === filter;
}

export const MAX_CUSTOM_ENTRIES = 6;
export const CUSTOM_ENTRY_MAX_LENGTH = 30;
export const CUSTOM_COLORS = ["#E07552", "#E2A73A", "#2F8F7A", "#C2504A", "#4F5D8C", "#B5677E"];

export function emptyCustomEntries(): string[] {
  return Array.from({ length: MAX_CUSTOM_ENTRIES }, () => "");
}

export function updateCustomEntry(entries: string[], index: number, value: string): string[] {
  if (index < 0 || index >= MAX_CUSTOM_ENTRIES) return entries;
  const next = entries.slice(0, MAX_CUSTOM_ENTRIES);
  while (next.length < MAX_CUSTOM_ENTRIES) next.push("");
  next[index] = value.slice(0, CUSTOM_ENTRY_MAX_LENGTH);
  return next;
}

/** Only entries with real text reach the wheel; whitespace-only boxes are ignored. */
export function customSpinItems(entries: string[]): { id: string; name: string; color: string }[] {
  return entries.slice(0, MAX_CUSTOM_ENTRIES).flatMap((raw, i) => {
    const name = raw.trim();
    return name ? [{ id: `custom-${i}`, name, color: CUSTOM_COLORS[i % CUSTOM_COLORS.length] }] : [];
  });
}

export function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
