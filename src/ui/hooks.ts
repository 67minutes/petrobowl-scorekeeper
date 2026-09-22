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

/** Trigger a browser download of some text (CSV, JSON, …). */
export function downloadText(filename: string, content: string, type = 'text/plain;charset=utf-8') {
  // Prepend a BOM for CSV so Excel reads UTF-8 correctly.
  const body = type.includes('csv') ? '﻿' + content : content;
  const blob = new Blob([body], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
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
