import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import type { Venue } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Type-ahead search for picking one directory listing. */
export function VenuePicker({
  listings,
  value,
  onChange,
  placeholder = "Search by restaurant name",
  emptyHint,
}: {
  listings: Venue[];
  value: Venue | undefined;
  onChange: (venue: Venue | undefined) => void;
  placeholder?: string;
  /** Shown when the query matches nothing. */
  emptyHint: string;
}) {
  const [query, setQuery] = useState("");
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return listings
      .filter((l) => l.name.toLowerCase().includes(q) || l.neighborhood.toLowerCase().includes(q))
      .slice(0, 6);
  }, [listings, query]);

  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-xl border bg-muted/40 p-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
          style={{ backgroundColor: value.color }}
        >
          {value.initials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{value.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {value.address}, {value.city}
          </p>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={() => onChange(undefined)} aria-label="Choose a different listing">
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        id="venue-search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="pl-9"
        autoComplete="off"
      />
      {matches.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border bg-popover shadow-lg">
          {matches.map((l) => (
            <li key={l.id}>
              <button
                type="button"
                onClick={() => {
                  onChange(l);
                  setQuery("");
                }}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted"
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-bold text-white"
                  style={{ backgroundColor: l.color }}
                >
                  {l.initials}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{l.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {l.neighborhood ? `${l.neighborhood} · ` : ""}
                    {l.city}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {query.trim() && matches.length === 0 && (
        <p className="mt-2 text-xs text-muted-foreground">{emptyHint}</p>
      )}
    </div>
  );
}
