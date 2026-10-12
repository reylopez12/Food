import { ChevronDown, Loader2, Navigation, X } from "lucide-react";
import { RADIUS_OPTIONS, type LocationStatus, type RadiusMiles } from "@/hooks/useNearMe";
import { PRICE_FILTER_OPTIONS, type PriceFilter } from "@/lib/spinWheel";

export type WheelEditor = "distance" | "price" | "custom";

const EDITOR_OPTIONS: { id: WheelEditor; label: string }[] = [
  { id: "distance", label: "Distance" },
  { id: "price", label: "Price" },
  { id: "custom", label: "Custom" },
];

type Props = {
  editor: WheelEditor;
  disabled: boolean;
  radius: RadiusMiles | null;
  priceFilter: PriceFilter;
  locationStatus: LocationStatus;
  onEditorChange: (editor: WheelEditor) => void;
  onRadiusChange: (radius: RadiusMiles) => void;
  onClearRadius: () => void;
  onPriceChange: (price: PriceFilter) => void;
  onRequestLocation: () => void;
};

const pill = (active: boolean) =>
  `flex-1 min-w-[3rem] py-1.5 rounded-full border text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
    active
      ? "bg-secondary text-secondary-foreground border-secondary"
      : "border-white/25 text-white hover:border-white/50 hover:bg-white/10"
  }`;

export function HomeSpinControls(props: Props) {
  const { editor, disabled, radius, priceFilter, locationStatus } = props;
  const hasFilters = radius !== null || priceFilter !== "any";

  return (
    <div className="max-w-sm mx-auto lg:mx-0 p-4 border border-white/20 rounded-2xl bg-white/5 text-left">
      <label className="flex items-center justify-between gap-3 mb-4">
        <span className="text-xs font-bold text-white/80 uppercase tracking-widest">Edit wheel</span>
        <span className="relative">
          <select
            value={editor}
            onChange={(e) => props.onEditorChange(e.target.value as WheelEditor)}
            disabled={disabled}
            className="appearance-none h-9 pl-4 pr-9 rounded-full bg-background text-foreground text-sm font-bold cursor-pointer focus:outline-none focus:ring-2 focus:ring-secondary disabled:opacity-50"
            data-testid="select-wheel-editor"
          >
            {EDITOR_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/60" />
        </span>
      </label>

      {editor === "distance" && (
        <div>
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="text-[11px] font-mono text-white/60">Within</span>
            {radius !== null && locationStatus !== "granted" && (
              <button
                type="button"
                onClick={props.onRequestLocation}
                disabled={disabled || locationStatus === "requesting" || locationStatus === "unavailable"}
                className="inline-flex items-center gap-1 text-xs font-bold text-white underline hover:text-secondary transition-colors disabled:opacity-50"
                data-testid="button-enable-location"
              >
                {locationStatus === "requesting" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3" />}
                {locationStatus === "requesting" ? "Locating..." : "Enable location"}
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {RADIUS_OPTIONS.map((option) => (
              <button key={option} type="button" onClick={() => props.onRadiusChange(option)} disabled={disabled}
                className={pill(radius === option)} aria-pressed={radius === option} data-testid={`button-radius-${option}`}>
                {option} mi
              </button>
            ))}
          </div>
        </div>
      )}

      {editor === "price" && (
        <div>
          <span className="block text-[11px] font-mono text-white/60 mb-2">Price tier</span>
          <div className="flex flex-wrap gap-2">
            {PRICE_FILTER_OPTIONS.map((o) => (
              <button key={o.id} type="button" onClick={() => props.onPriceChange(o.id)} disabled={disabled}
                className={`${pill(priceFilter === o.id)} ${o.id === "any" ? "basis-full sm:basis-auto" : ""}`}
                aria-pressed={priceFilter === o.id} data-testid={`button-price-${o.id}`}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {editor === "custom" && (
        <p className="text-sm text-white/85 leading-relaxed">
          Type your own options in the boxes beside the wheel. Distance and price don't apply to custom choices.
        </p>
      )}

      {editor !== "custom" && (
        <div className="mt-4 pt-3 border-t border-white/15 flex flex-wrap items-center gap-2 min-h-8" data-testid="status-active-filters">
          {!hasFilters && <span className="text-xs text-white/60">No filters. Whole directory in play.</span>}
          {radius !== null && (
            <button type="button" onClick={props.onClearRadius} disabled={disabled}
              className="inline-flex items-center gap-1 rounded-full bg-white/15 pl-3 pr-2 py-1 text-xs font-bold text-white hover:bg-white/25 transition-colors disabled:opacity-40"
              data-testid="button-clear-radius">
              Within {radius} mi <X className="w-3 h-3" />
            </button>
          )}
          {priceFilter !== "any" && (
            <button type="button" onClick={() => props.onPriceChange("any")} disabled={disabled}
              className="inline-flex items-center gap-1 rounded-full bg-white/15 pl-3 pr-2 py-1 text-xs font-bold text-white hover:bg-white/25 transition-colors disabled:opacity-40"
              data-testid="button-clear-price">
              {priceFilter} only <X className="w-3 h-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
