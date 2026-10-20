export const WHEEL_SOUND_KEY = "spotted-eats:wheel-sound";

export function readWheelSoundPreference(storage: Pick<Storage, "getItem">): boolean {
  try {
    return storage.getItem(WHEEL_SOUND_KEY) !== "off";
  } catch {
    return true;
  }
}

/** Audio is created only in a click handler, never on page load. */
export class WheelSound {
  private context: AudioContext | null = null;
  private gain: GainNode | null = null;
  private enabled = true;
  private lastSegment = 0;
  private slice = 2 * Math.PI;
  private lastTick = -Infinity;

  constructor(
    private createContext: () => AudioContext,
    private onError: () => void,
  ) {}

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (this.context && this.gain) {
      this.gain.gain.setValueAtTime(enabled ? 1 : 0, this.context.currentTime);
    }
  }

  unlock() {
    if (!this.enabled) return;
    try {
      if (!this.context) {
        this.context = this.createContext();
        this.gain = this.context.createGain();
        this.gain.connect(this.context.destination);
      }
      if (this.context.state === "suspended") {
        void this.context.resume().catch(this.onError);
      }
    } catch {
      this.onError();
    }
  }

  start(angle: number, count: number) {
    this.slice = 2 * Math.PI / Math.max(1, count);
    this.lastSegment = Math.floor(angle / this.slice);
    this.lastTick = -Infinity;
    this.unlock();
  }

  tick(angle: number) {
    const segment = Math.floor(angle / this.slice);
    if (segment === this.lastSegment) return;
    this.lastSegment = segment;
    const context = this.context;
    if (!context || context.currentTime - this.lastTick < 0.045) return;
    if (this.tone(1000, 0, 0.025, 0.04, "triangle")) {
      this.lastTick = context.currentTime;
    }
  }

  finish() {
    [523.25, 659.25, 783.99].forEach((frequency, i) => {
      this.tone(frequency, i * 0.09, 0.18, 0.075, "sine");
    });
  }

  private tone(frequency: number, delay: number, duration: number, volume: number, type: OscillatorType) {
    const context = this.context;
    if (!this.enabled || !context || !this.gain || context.state !== "running") return false;
    try {
      const oscillator = context.createOscillator();
      const envelope = context.createGain();
      const start = context.currentTime + delay;
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, start);
      envelope.gain.setValueAtTime(0.001, start);
      envelope.gain.exponentialRampToValueAtTime(volume, start + 0.003);
      envelope.gain.exponentialRampToValueAtTime(0.001, start + duration);
      oscillator.connect(envelope);
      envelope.connect(this.gain);
      oscillator.onended = () => {
        oscillator.disconnect();
        envelope.disconnect();
      };
      oscillator.start(start);
      oscillator.stop(start + duration + 0.01);
      return true;
    } catch {
      this.onError();
      return false;
    }
  }

  dispose() {
    if (this.context && this.context.state !== "closed") {
      void this.context.close().catch(() => {});
    }
    this.context = null;
    this.gain = null;
  }
}
