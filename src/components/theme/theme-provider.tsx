'use client';

import { useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { applyTheme, isThemePreference, themeColors, themeEvent, themeStorageKey, type ResolvedTheme, type ThemePreference } from './theme';

function subscribe(listener: () => void) {
  window.addEventListener(themeEvent, listener);
  return () => window.removeEventListener(themeEvent, listener);
}

function getPreference(): ThemePreference {
  const value = document.documentElement.dataset.themePreference;
  return isThemePreference(value) ? value : 'light';
}

export function setThemePreference(preference: ThemePreference) {
  try { localStorage.setItem(themeStorageKey, preference); } catch { /* The theme remains usable without storage. */ }
  applyTheme(preference, themeColors);
  window.dispatchEvent(new Event(themeEvent));
}

export function useThemePreference() {
  return useSyncExternalStore(subscribe, getPreference, () => 'light' as ThemePreference);
}

export function useResolvedTheme(): ResolvedTheme {
  return useSyncExternalStore(subscribe,
    () => document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
    () => 'light');
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // The bootstrap has already selected the first-paint theme.
    // Another tab may change storage while this page is still hydrating, before
    // the storage listener exists. Reconcile once without requiring a reload.
    let initialPreference = getPreference();
    try {
      const saved = localStorage.getItem(themeStorageKey);
      initialPreference = isThemePreference(saved) ? saved : 'light';
    } catch { /* Keep the in-memory preference if storage is unavailable. */ }
    applyTheme(initialPreference, themeColors);
    const refresh = () => {
      applyTheme(getPreference(), themeColors);
      window.dispatchEvent(new Event(themeEvent));
    };
    const device = window.matchMedia('(prefers-color-scheme: dark)');
    const onDeviceChange = () => { if (getPreference() === 'system') refresh(); };
    const onStorage = (event: StorageEvent) => {
      if (event.key !== themeStorageKey && event.key !== null) return;
      applyTheme(isThemePreference(event.newValue) ? event.newValue : 'light', themeColors);
      window.dispatchEvent(new Event(themeEvent));
    };
    refresh();
    device.addEventListener('change', onDeviceChange);
    window.addEventListener('storage', onStorage);
    return () => {
      device.removeEventListener('change', onDeviceChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);
  return children;
}
