import tokens from '../../../docs/design-system/tokens.json';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';
export const themeStorageKey = 'geoalerta-theme';
export const themeEvent = 'geoalerta-theme-change';
export const themeColors = {
  light: tokens.themes.light.background,
  dark: tokens.themes.dark.background,
};

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

// Self-contained so the exact same function can run before React hydration.
export function applyTheme(preference: ThemePreference, colors: typeof themeColors): void {
  const theme = preference === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : preference;
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.themePreference = preference;
  // React hoists metadata by content. Keep this dynamic tag outside its resource
  // matching, so the first-paint update cannot create a second light tag.
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  meta.content = colors[theme];
}

export const themeBootstrap = `(()=>{let preference='light';try{const saved=localStorage.getItem(${JSON.stringify(themeStorageKey)});if(saved==='light'||saved==='dark'||saved==='system')preference=saved}catch{}(${applyTheme.toString()})(preference,${JSON.stringify(themeColors)})})()`;
