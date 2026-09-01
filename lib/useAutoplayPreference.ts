'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'edition-autoplay-videos';

// A per-device reader preference, same pattern as dark mode in
// ThemeProvider - no account needed, works for signed-out visitors too.
// Defaults to on (autoplay is the feature being asked for); readers who
// don't want it can turn it off in Settings, and that choice sticks.
export function useAutoplayPreference() {
  const [autoplay, setAutoplayState] = useState(true);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored !== null) setAutoplayState(stored === 'true');
  }, []);

  const setAutoplay = (value: boolean) => {
    setAutoplayState(value);
    window.localStorage.setItem(STORAGE_KEY, String(value));
  };

  return { autoplay, setAutoplay };
}
