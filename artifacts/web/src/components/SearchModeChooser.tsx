import { Building2, MapPin, Navigation, UtensilsCrossed } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type SearchMode = "food" | "city" | "neighborhood" | "near-me";

export const SEARCH_MODE_LABELS: Record<SearchMode, string> = {
  food: "Food",
  city: "City",
  neighborhood: "Neighborhood",
  "near-me": "Near me",
};

const SEARCH_MODE_ICONS = {
  food: UtensilsCrossed,
  city: Building2,
  neighborhood: MapPin,
  "near-me": Navigation,
} satisfies Record<SearchMode, typeof UtensilsCrossed>;

interface SearchModeChooserProps {
  value: SearchMode;
  onValueChange: (value: SearchMode) => void;
  className?: string;
}

export function SearchModeChooser({
  value,
  onValueChange,
  className,
}: SearchModeChooserProps) {
  return (
    <Select value={value} onValueChange={(next) => onValueChange(next as SearchMode)}>
      <SelectTrigger
        className={`h-11 w-full border-0 bg-transparent px-0 text-sm font-semibold shadow-none focus:ring-0 ${className ?? ""}`}
        aria-label="Choose what to search"
      >
        {/* The selected item's own icon + label render inside SelectValue */}
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(SEARCH_MODE_LABELS) as SearchMode[]).map((mode) => {
          const ModeIcon = SEARCH_MODE_ICONS[mode];
          return (
            <SelectItem key={mode} value={mode}>
              <span className="flex items-center gap-2">
                <ModeIcon className="h-4 w-4" />
                {SEARCH_MODE_LABELS[mode]}
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}