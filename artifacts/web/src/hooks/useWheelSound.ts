import { useCallback, useEffect, useRef, useState } from "react";
import { readWheelSoundPreference, WheelSound, WHEEL_SOUND_KEY } from "@/lib/wheelSound";

const CHANGE_EVENT = "spotted-eats:wheel-sound-change";

function readPreference() {
  try {
    return readWheelSoundPreference(window.localStorage);
  } catch {
    return true;
  }
}

export function useWheelSound() {
  const [enabled, setEnabled] = useState(readPreference);
  const [unavailable, setUnavailable] = useState(false);
  const player = useRef<WheelSound | null>(null);
  const enabledRef = useRef(enabled);

  const getPlayer = useCallback(() => {
    if (!player.current) {
      player.current = new WheelSound(() => {
        const AudioConstructor = window.AudioContext
          ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioConstructor) throw new Error("Web Audio is unavailable");
        return new AudioConstructor();
      }, () => setUnavailable(true));
      player.current.setEnabled(enabledRef.current);
    }
    return player.current;
  }, []);

  useEffect(() => {
    const sync = () => {
      const value = readPreference();
      enabledRef.current = value;
      setEnabled(value);
      player.current?.setEnabled(value);
    };
    window.addEventListener("storage", sync);
    window.addEventListener(CHANGE_EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(CHANGE_EVENT, sync);
      player.current?.dispose();
      player.current = null;
    };
  }, []);

  const toggle = useCallback(() => {
    const value = !enabledRef.current;
    enabledRef.current = value;
    setEnabled(value);
    const sound = getPlayer();
    sound.setEnabled(value);
    if (value) {
      setUnavailable(false);
      sound.unlock();
    }
    try {
      window.localStorage.setItem(WHEEL_SOUND_KEY, value ? "on" : "off");
      window.dispatchEvent(new Event(CHANGE_EVENT));
    } catch {
      // Private/blocked storage still allows this page's toggle to work.
    }
  }, [getPlayer]);

  return {
    enabled,
    unavailable,
    toggle,
    start: (angle: number, count: number) => getPlayer().start(angle, count),
    tick: (angle: number) => player.current?.tick(angle),
    finish: () => player.current?.finish(),
  };
}
