import { useEffect, useState } from 'react';

/** Re-render on an interval (for timers). */
export function useNow(intervalMs = 250): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function formatClock(sec: number | null): string {
  if (sec == null) return '--:--';
  const s = Math.ceil(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

let displayWin: Window | null = null;

/** Open (or focus) the big-screen window. Drag it to the projector and press F11. */
export function openDisplayWindow() {
  if (displayWin && !displayWin.closed) {
    displayWin.focus();
    return;
  }
  const url = `${window.location.pathname}#/display`;
  displayWin = window.open(url, 'petrobowl-display', 'width=1280,height=720');
}
