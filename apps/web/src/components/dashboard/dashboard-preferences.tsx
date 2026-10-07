'use client';

import { Moon, Sun } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';

type ThemeMode = 'dark' | 'light';
type LocaleMode = 'en' | 'ar';
const themeStorageKey = 'sitescope-theme';
const legacyThemeStorageKey = 'sentinelqa-theme';

export function DashboardPreferences({ locale }: { locale: LocaleMode }) {
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [activeLocale, setActiveLocale] = useState<LocaleMode>(locale);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(themeStorageKey) ?? window.localStorage.getItem(legacyThemeStorageKey);
    const nextTheme: ThemeMode = storedTheme === 'light' ? 'light' : 'dark';
    setTheme(nextTheme);
    window.localStorage.setItem(themeStorageKey, nextTheme);
    document.documentElement.classList.toggle('light', nextTheme === 'light');

    const params = new URLSearchParams(window.location.search);
    const nextLocale: LocaleMode = params.get('locale') === 'ar' ? 'ar' : locale;
    setActiveLocale(nextLocale);
    document.documentElement.lang = nextLocale;
    document.documentElement.dir = nextLocale === 'ar' ? 'rtl' : 'ltr';
  }, [locale]);

  const toggleTheme = (event: React.MouseEvent<HTMLButtonElement>) => {
    const nextTheme: ThemeMode = theme === 'dark' ? 'light' : 'dark';
    const apply = () => {
      setTheme(nextTheme);
      window.localStorage.setItem(themeStorageKey, nextTheme);
      document.documentElement.classList.toggle('light', nextTheme === 'light');
    };

    // The new theme spreads out in a circle from the button where the browser supports view transitions.
    const doc = document as Document & { startViewTransition?: (callback: () => void) => { ready: Promise<void> } };
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!doc.startViewTransition || reduce) {
      apply();
      return;
    }
    const x = event.clientX || window.innerWidth;
    const y = event.clientY || 0;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    const transition = doc.startViewTransition(apply);
    void transition.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 750, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', pseudoElement: '::view-transition-new(root)' }
      );
    });
  };

  const toggleLocale = () => {
    const nextLocale: LocaleMode = activeLocale === 'en' ? 'ar' : 'en';
    const params = new URLSearchParams(window.location.search);
    params.set('locale', nextLocale);
    params.set('dir', nextLocale === 'ar' ? 'rtl' : 'ltr');
    window.location.search = params.toString();
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={theme === 'dark' ? 'Dark' : 'Light'}
        className="group relative inline-flex h-9 items-center gap-2 overflow-hidden rounded-lg border border-border bg-card/70 px-3 text-xs font-semibold text-foreground transition-colors hover:border-muted-foreground/50"
      >
        <span className="relative h-4 w-4">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={theme}
              className="absolute inset-0"
              initial={{ rotate: -90, scale: 0, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              exit={{ rotate: 90, scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 22 }}
            >
              {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4 text-primary" />}
            </motion.span>
          </AnimatePresence>
        </span>
        {theme === 'dark' ? 'Dark' : 'Light'}
      </button>
      <button
        type="button"
        onClick={toggleLocale}
        className="relative inline-flex h-9 items-center rounded-lg border border-border bg-card/70 p-1 font-mono text-[11px] font-semibold"
        aria-label={activeLocale === 'en' ? 'EN' : 'AR'}
      >
        {(['en', 'ar'] as const).map((option) => (
          <span key={option} className={`relative z-10 rounded-md px-2 py-1 transition-colors ${activeLocale === option ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
            {activeLocale === option ? <motion.span layoutId="locale-pill" className="absolute inset-0 -z-10 rounded-md bg-primary" /> : null}
            {option.toUpperCase()}
          </span>
        ))}
      </button>
    </div>
  );
}
