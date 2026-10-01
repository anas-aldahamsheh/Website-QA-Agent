'use client';

import { Languages, Moon, Sun } from 'lucide-react';
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

  const toggleTheme = () => {
    const nextTheme: ThemeMode = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    window.localStorage.setItem(themeStorageKey, nextTheme);
    document.documentElement.classList.toggle('light', nextTheme === 'light');
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
        className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-xs font-semibold text-foreground"
      >
        {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        {theme === 'dark' ? 'Dark' : 'Light'}
      </button>
      <button
        type="button"
        onClick={toggleLocale}
        className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-xs font-semibold text-foreground"
      >
        <Languages className="h-4 w-4" />
        {activeLocale === 'en' ? 'EN' : 'AR'}
      </button>
    </div>
  );
}
