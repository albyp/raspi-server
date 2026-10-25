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

function systemTheme() {
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
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
  const [theme, setTheme] = useState(() => load('dash.theme', null) || systemTheme());
  const [redacted, setRedacted] = useState(() => load('dash.redacted', false));

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    save('dash.theme', theme);
  }, [theme]);

  useEffect(() => { save('dash.redacted', redacted); }, [redacted]);

  const toggleTheme = useCallback(() => setTheme(t => (t === 'light' ? 'dark' : 'light')), []);
  const toggleRedact = useCallback(() => setRedacted(r => !r), []);
  const redact = useCallback(text => (redacted ? redactText(text) : text), [redacted]);

  return (
    <PrefsContext.Provider value={{ theme, toggleTheme, redacted, toggleRedact, redact }}>
      {children}
    </PrefsContext.Provider>
  );
}

export function usePrefs() {
  return useContext(PrefsContext);
}
