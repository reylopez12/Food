import { RotateCcw, X } from "lucide-react";
import { CUSTOM_COLORS, CUSTOM_ENTRY_MAX_LENGTH } from "@/lib/spinWheel";

type Props = {
  entries: string[];
  filledCount: number;
  disabled: boolean;
  onChange: (index: number, value: string) => void;
  onReset: () => void;
};

export function CustomChoicesPanel({ entries, filledCount, disabled, onChange, onReset }: Props) {
  const hasText = entries.some((e) => e.length > 0);
  return (
    <div
      className="w-full md:w-64 rounded-3xl bg-background/95 text-foreground p-5 shadow-2xl ring-1 ring-black/5"
      data-testid="panel-custom-choices"
    >
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <h3 className="font-serif text-xl font-bold tracking-tight">Your choices</h3>
        <span className="font-mono text-[11px] text-muted-foreground" data-testid="text-custom-count">
          {filledCount}/{entries.length}
        </span>
      </div>
      <p className="text-xs text-muted-foreground mb-4">Only filled boxes land on the wheel.</p>
      <div className="flex flex-col gap-2">
        {entries.map((entry, i) => (
          <div key={i} className="group relative flex items-center">
            <span
              className="absolute left-2.5 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-white"
              style={{ backgroundColor: CUSTOM_COLORS[i] }}
              aria-hidden
            >
              {i + 1}
            </span>
            <input
              value={entry}
              onChange={(e) => onChange(i, e.target.value)}
              placeholder={`Choice ${i + 1}`}
              maxLength={CUSTOM_ENTRY_MAX_LENGTH}
              disabled={disabled}
              aria-label={`Custom choice ${i + 1}`}
              className="w-full h-10 rounded-xl border border-border bg-card pl-10 pr-9 text-sm font-medium placeholder:text-muted-foreground/60 transition-colors focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/25 disabled:opacity-50"
              data-testid={`input-custom-choice-${i}`}
            />
            {entry.length > 0 && (
              <button
                type="button"
                onClick={() => onChange(i, "")}
                disabled={disabled}
                aria-label={`Clear choice ${i + 1}`}
                className="absolute right-2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40"
                data-testid={`button-clear-choice-${i}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={onReset}
        disabled={disabled || !hasText}
        className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        data-testid="button-reset-choices"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        Reset choices
      </button>
    </div>
  );
}
