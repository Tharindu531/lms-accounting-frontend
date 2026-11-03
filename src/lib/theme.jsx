import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext(null);
const media = () => window.matchMedia('(prefers-color-scheme: dark)');
const read = () => { try { return localStorage.getItem('theme') || 'system'; } catch { return 'system'; } };

/** theme: 'light' | 'dark' | 'system'. 'system' follows the phone or computer setting live. */
export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(read);
  const [systemDark, setSystemDark] = useState(() => media().matches);

  useEffect(() => {
    const m = media();
    const on = (e) => setSystemDark(e.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);

  const resolved = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;

  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolved === 'dark');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'dark' ? '#0e1424' : '#f5f7fb');
  }, [resolved]);

  const setTheme = useCallback((t) => {
    setThemeState(t);
    try { localStorage.setItem('theme', t); } catch { /* ignore */ }
  }, []);

  const value = useMemo(() => ({ theme, resolved, setTheme }), [theme, resolved, setTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => useContext(ThemeContext);
