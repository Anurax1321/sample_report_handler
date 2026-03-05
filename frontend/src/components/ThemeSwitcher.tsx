import { useState, useRef, useEffect } from 'react';
import { useTheme, type Theme } from '../context/ThemeContext';
import './ThemeSwitcher.css';

const themes: { id: Theme; label: string; colors: [string, string] }[] = [
  { id: 'glass', label: 'Glassmorphism', colors: ['#6366f1', '#a855f7'] },
  { id: 'cyber', label: 'Cyber Neon', colors: ['#00f0ff', '#bf00ff'] },
  { id: 'space', label: 'Deep Space', colors: ['#3b82f6', '#06b6d4'] },
  { id: 'matrix', label: 'Matrix', colors: ['#00ff41', '#00cc33'] },
];

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="theme-switcher" ref={ref}>
      <button
        className="theme-switcher-btn"
        onClick={() => setOpen(!open)}
        aria-label="Switch theme"
        title="Switch theme"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2a10 10 0 0 1 0 20" fill="currentColor" opacity="0.3" />
          <circle cx="12" cy="12" r="4" />
        </svg>
      </button>
      {open && (
        <div className="theme-dropdown">
          {themes.map((t) => (
            <button
              key={t.id}
              className={`theme-option ${theme === t.id ? 'active' : ''}`}
              onClick={() => {
                setTheme(t.id);
                setOpen(false);
              }}
            >
              <span
                className="theme-swatch"
                style={{
                  background: `linear-gradient(135deg, ${t.colors[0]}, ${t.colors[1]})`,
                }}
              />
              <span className="theme-label">{t.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
