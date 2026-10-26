import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

// Per-browser display preferences: light/dark theme and IP redaction (for screenshots)

const PrefsContext = createContext(null);

function load(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : JSON.parse(v);
  } catch {
    return fallback;
  }
}

function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode etc. */ }
}

// Keep ids in sync with the :root[data-theme] blocks in index.css and the boot script in index.html
export const THEMES = [
  { id: 'dark', name: 'Dark', swatch: ['#111315', '#00d4aa', '#e8eaed'] },
  { id: 'light', name: 'Light', swatch: ['#f3f4f6', '#00826a', '#1a1d21'] },
  { id: 'pi', name: 'Pi', swatch: ['#f4ecdf', '#c51a4a', '#3a7d34'] },
  { id: 'terminal', name: 'Terminal', swatch: ['#1e1e2e', '#cba6f7', '#89b4fa'] },
];

function systemTheme() {
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function initialTheme() {
  const stored = load('dash.theme', null);
  return THEMES.some(t => t.id === stored) ? stored : systemTheme();
}

const IPV4 = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
// IPv6: hex groups with 3+ colons, so clock times like 04:59:00 are left alone
const IPV6 = /\b[0-9a-f]{1,4}(?::[0-9a-f]{0,4}){3,7}\b/gi;
// Port after a masked address, e.g. xx.xx.xx.xx:41641
const PORT = /(xx\.xx\.xx\.xx|xxxx:xxxx::xxxx)\]?:\d{2,5}\b/g;

export function redactText(text) {
  if (text == null) return text;
  return String(text)
    .replace(IPV4, 'xx.xx.xx.xx')
    .replace(IPV6, 'xxxx:xxxx::xxxx')
    .replace(PORT, '$1:xxxxx');
}

export function PrefsProvider({ children }) {
  const [theme, setTheme] = useState(initialTheme);
  const [redacted, setRedacted] = useState(() => load('dash.redacted', false));

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    save('dash.theme', theme);
  }, [theme]);

  useEffect(() => { save('dash.redacted', redacted); }, [redacted]);

  const toggleRedact = useCallback(() => setRedacted(r => !r), []);
  const redact = useCallback(text => (redacted ? redactText(text) : text), [redacted]);

  return (
    <PrefsContext.Provider value={{ theme, setTheme, redacted, toggleRedact, redact }}>
      {children}
    </PrefsContext.Provider>
  );
}

export function usePrefs() {
  return useContext(PrefsContext);
}
