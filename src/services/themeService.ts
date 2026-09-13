/**
 * Theme Management Service
 * Supports 'light' | 'dark' | 'system' modes with high-contrast night-shift styling
 */

export type ThemeMode = 'light' | 'dark' | 'system';

const THEME_STORAGE_KEY = 'fxtt_theme_mode';

/**
 * Reads the currently stored theme preference, default to 'light'
 */
export function getStoredThemeMode(): ThemeMode {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark' || saved === 'light' || saved === 'system') {
      return saved;
    }
  } catch (e) {
    console.warn('Unable to read theme from localStorage', e);
  }
  return 'light';
}

/**
 * Determines whether dark mode is currently effective (resolves 'system' to OS preference)
 */
export function isDarkEffective(mode: ThemeMode = getStoredThemeMode()): boolean {
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  // system
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  return false;
}

/**
 * Applies or removes the 'dark' class on document.documentElement
 */
export function applyThemeToDocument(mode: ThemeMode = getStoredThemeMode()): void {
  if (typeof document === 'undefined') return;

  const effectiveDark = isDarkEffective(mode);
  const root = document.documentElement;

  if (effectiveDark) {
    root.classList.add('dark');
    root.style.colorScheme = 'dark';
  } else {
    root.classList.remove('dark');
    root.style.colorScheme = 'light';
  }

  // Dispatch event for any reactive subscribers
  window.dispatchEvent(
    new CustomEvent('fxtt-theme-changed', {
      detail: { mode, isDark: effectiveDark }
    })
  );
}

/**
 * Persists theme selection to localStorage and updates DOM
 */
export function setStoredThemeMode(mode: ThemeMode): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch (e) {
    console.warn('Unable to save theme to localStorage', e);
  }
  applyThemeToDocument(mode);
}

/**
 * Initialize theme listener on window startup
 */
export function initThemeListener(): () => void {
  const current = getStoredThemeMode();
  applyThemeToDocument(current);

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const listener = () => {
    if (getStoredThemeMode() === 'system') {
      applyThemeToDocument('system');
    }
  };

  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  } else if ((mediaQuery as any).addListener) {
    (mediaQuery as any).addListener(listener);
    return () => (mediaQuery as any).removeListener(listener);
  }

  return () => {};
}
