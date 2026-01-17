import React, { useEffect, useState } from 'react';
import { MaterialIcon } from './MaterialIcon';

const STORAGE_KEY = 'gigCalcTheme';

type Theme = 'dark' | 'high' | 'light';

export const ThemeSwitcher: React.FC = () => {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
      return (saved === 'high' || saved === 'light') ? saved : 'dark';
    } catch {
      return 'dark';
    }
  });

  const applyTheme = (t: Theme) => {
    document.documentElement.classList.remove('theme-high-contrast', 'theme-light');
    if (t === 'high') document.documentElement.classList.add('theme-high-contrast');
    if (t === 'light') document.documentElement.classList.add('theme-light');
  };

  useEffect(() => {
    // Apply the initial theme class (no state updates here)
    applyTheme(theme);
  }, [theme]);

  const cycle = () => {
    const next: Theme = theme === 'dark' ? 'high' : theme === 'high' ? 'light' : 'dark';
    setTheme(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { void 0; }
    applyTheme(next);
  };

  const ariaLabel = theme === 'dark' ? 'Switch to high contrast theme' : theme === 'high' ? 'Switch to light theme' : 'Switch to default dark theme';
  const title = theme === 'dark' ? 'Theme: Dark' : theme === 'high' ? 'Theme: High Contrast' : 'Theme: Light';
  const icon = theme === 'dark' ? 'invert_colors' : theme === 'high' ? 'contrast' : 'light_mode';

  return (
    <button
      onClick={cycle}
      aria-label={ariaLabel}
      title={title}
      className="theme-switcher"
    >
      <MaterialIcon icon={icon} ariaLabel={`Theme: ${theme}`} />
    </button>
  );
};
