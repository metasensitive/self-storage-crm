import { useCallback, useEffect, useState } from 'react';

export type Density = 'compact' | 'comfortable' | 'spacious';
export type Theme = 'light' | 'dark';

export interface Tweaks {
  theme: Theme;
  density: Density;
}

const DEFAULTS: Tweaks = {
  theme: 'light',
  density: 'comfortable',
};

const STORAGE_KEY = 'storehaus.tweaks';

function read(): Tweaks {
  if (typeof window === 'undefined') return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<Tweaks>;
    return {
      theme: parsed.theme === 'dark' || parsed.theme === 'light' ? parsed.theme : DEFAULTS.theme,
      density:
        parsed.density === 'compact' ||
        parsed.density === 'comfortable' ||
        parsed.density === 'spacious'
          ? parsed.density
          : DEFAULTS.density,
    };
  } catch {
    return DEFAULTS;
  }
}

export function useTweaks() {
  const [tweaks, setTweaks] = useState<Tweaks>(() => read());

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', tweaks.theme);
    document.documentElement.setAttribute('data-density', tweaks.density);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tweaks));
  }, [tweaks]);

  const setTweak = useCallback(<K extends keyof Tweaks>(key: K, value: Tweaks[K]) => {
    setTweaks((prev) => ({ ...prev, [key]: value }));
  }, []);

  return { tweaks, setTweak };
}
