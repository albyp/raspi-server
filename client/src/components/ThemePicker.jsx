import React, { useEffect, useRef, useState } from 'react';
import { FiDroplet, FiCheck } from 'react-icons/fi';
import { THEMES, usePrefs } from '../prefs';

function Swatch({ colors }) {
  return (
    <span className="swatch" aria-hidden="true">
      {colors.map(c => <span key={c} style={{ background: c }} />)}
    </span>
  );
}

export default function ThemePicker() {
  const { theme, setTheme } = usePrefs();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = THEMES.find(t => t.id === theme) || THEMES[0];

  useEffect(() => {
    if (!open) return;
    const onDown = e => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const onKey = e => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="theme-picker" ref={ref}>
      <button
        className="icon-btn"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        title="Change theme"
      >
        <FiDroplet aria-hidden="true" />
        <span className="btn-label">{current.name}</span>
      </button>
      {open && (
        <div className="theme-menu" role="group" aria-label="Theme">
          {THEMES.map(t => (
            <button
              key={t.id}
              className="theme-option"
              aria-pressed={t.id === theme}
              onClick={() => { setTheme(t.id); setOpen(false); }}
            >
              <Swatch colors={t.swatch} />
              <span className="theme-name">{t.name}</span>
              {t.id === theme && <FiCheck className="theme-check" aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
