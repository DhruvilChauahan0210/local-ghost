'use client';

import { useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    const stored = localStorage.getItem('lg-theme') as Theme | null;
    const preferred = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    const resolved = stored ?? preferred;
    setTheme(resolved);
    document.documentElement.setAttribute('data-theme', resolved);
  }, []);

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('lg-theme', next);
  }

  return (
    <button className="theme-toggle" onClick={toggle} aria-label="Toggle theme">
      <span className="theme-toggle-icon">{theme === 'dark' ? '◑' : '◐'}</span>
      {theme === 'dark' ? 'LIGHT' : 'DARK'}
    </button>
  );
}
