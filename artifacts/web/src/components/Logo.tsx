/** Binoculars mark: two eyepieces joined by a bridge, over round lenses. */
export function BinocularsMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 1 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 12.2 4 8a2 2 0 0 1 2-1.5h1A2 2 0 0 1 9 8l1 4.2" />
      <path d="M14 12.2 15 8a2 2 0 0 1 2-1.5h1a2 2 0 0 1 2 1.5l1 4.2" />
      <path d="M10 9.5h4M11 12.5h2" />
      <circle cx="6.5" cy="15" r="4.5" />
      <circle cx="17.5" cy="15" r="4.5" />
    </svg>
  );
}

/**
 * Spotted Eats logo: ink tile with the binoculars mark, and the name stacked
 * as "Spotted" (ink) over "Eats" (coral).
 *
 * `tone="onDark"` is for surfaces that are always dark (home header, footer):
 * the tile and "Spotted" switch to cream. `tone="auto"` follows the theme.
 */
export function Logo({ tone = "auto", className = "" }: { tone?: "auto" | "onDark"; className?: string }) {
  const tile = tone === "onDark" ? "bg-[#F7F4F0] text-[#1E232E]" : "bg-foreground text-background";
  const word = tone === "onDark" ? "text-[#F7F4F0]" : "text-foreground";

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tile}`}>
        <BinocularsMark className="h-7 w-7" />
      </span>
      <span className="flex flex-col font-sans text-[19px] font-extrabold leading-[0.95] tracking-tight">
        <span className={word}>Spotted</span>
        <span className="text-primary">Eats</span>
      </span>
    </span>
  );
}
