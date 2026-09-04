import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type { ThemePreference } from '@/domain/model';

const THEME_KEY = 'nwc-theme';

type ThemeContextValue = {
  preference: ThemePreference;
  effectiveTheme: 'light' | 'dark';
  setPreference: (theme: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function storedTheme(): ThemePreference {
  const value = localStorage.getItem(THEME_KEY);
  return value === 'light' || value === 'dark' || value === 'system' ? value : 'system';
}

function systemTheme(): 'light' | 'dark' {
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, updatePreference] = useState<ThemePreference>(storedTheme);
  const [system, setSystem] = useState<'light' | 'dark'>(systemTheme);
  const effectiveTheme = preference === 'system' ? system : preference;

  useEffect(() => {
    const query = matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event: MediaQueryListEvent) => setSystem(event.matches ? 'dark' : 'light');
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = effectiveTheme;
    document.documentElement.dataset.themePreference = preference;
    document.documentElement.style.colorScheme = effectiveTheme;
  }, [effectiveTheme, preference]);

  const setPreference = useCallback((theme: ThemePreference) => {
    localStorage.setItem(THEME_KEY, theme);
    updatePreference(theme);
  }, []);

  const value = useMemo(
    () => ({ preference, effectiveTheme, setPreference }),
    [effectiveTheme, preference, setPreference],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside ThemeProvider.');
  return value;
}
