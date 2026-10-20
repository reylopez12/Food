import { Volume2, VolumeX } from "lucide-react";

type Props = {
  enabled: boolean;
  unavailable: boolean;
  toggle: () => void;
};

export function WheelSoundToggle({ enabled, unavailable, toggle }: Props) {
  const Icon = enabled ? Volume2 : VolumeX;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label="Wheel sound"
      onClick={toggle}
      data-testid="wheel-sound-toggle"
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-current/25 px-4 text-sm font-semibold hover:bg-current/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-offset-2"
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      Sound {enabled ? "on" : "off"}
      {enabled && unavailable && <span role="status" className="text-xs font-normal">(unavailable)</span>}
    </button>
  );
}
