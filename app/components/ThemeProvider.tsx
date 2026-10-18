
'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

export type SocialsTheme = 'light' | 'dark' | 'forest';

interface ThemeContextValue {
  theme: SocialsTheme;
  setTheme: (theme: SocialsTheme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'socials-theme';

function isSocialsTheme(value: unknown): value is SocialsTheme {
  return (
    value === 'light' ||
    value === 'dark' ||
    value === 'forest'
  );
}

export default function ThemeProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [theme, setCurrentTheme] = useState<SocialsTheme>('light');

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem(STORAGE_KEY);

      if (isSocialsTheme(savedTheme)) {
        setCurrentTheme(savedTheme);
      }
    } catch {
      // Continue with the default theme.
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;

    root.classList.toggle('dark', theme !== 'light');
    root.dataset.theme = theme;
    root.style.colorScheme = theme === 'light' ? 'light' : 'dark';
  }, [theme]);

  const setTheme = useCallback((nextTheme: SocialsTheme) => {
    setCurrentTheme(nextTheme);

    try {
      localStorage.setItem(STORAGE_KEY, nextTheme);
    } catch {
      // Theme still applies for this session.
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useSocialsTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error(
      'useSocialsTheme must be used inside ThemeProvider'
    );
  }

  return context;
}
