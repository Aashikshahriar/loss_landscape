import { create } from 'zustand';
export type ThemeMode = 'system' | 'light' | 'dark';
export type Theme = 'light' | 'dark';
const key = 'optimizationland-theme';
const media = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null;
function stored(): ThemeMode {
  try {
    const v = localStorage.getItem(key);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}
const resolve = (mode: ThemeMode): Theme => (mode === 'system' ? (media?.matches ? 'dark' : 'light') : mode);
function apply(theme: Theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'dark' ? '#0b0e17' : '#f6f4ef');
}
interface ThemeState {
  mode: ThemeMode;
  theme: Theme;
  contrast: boolean;
  cycle: () => void;
  setContrast: (v: boolean) => void;
}
export const useTheme = create<ThemeState>((set, get) => {
  const mode = stored();
  apply(resolve(mode));
  media?.addEventListener('change', () => {
    if (get().mode !== 'system') return;
    const theme = resolve('system');
    apply(theme);
    set({ theme });
  });
  return {
    mode,
    theme: resolve(mode),
    contrast: false,
    cycle: () => {
      const next: ThemeMode = { system: 'light', light: 'dark', dark: 'system' }[get().mode] as ThemeMode;
      try {
        if (next === 'system') localStorage.removeItem(key);
        else localStorage.setItem(key, next);
      } catch {
        // Storage can be unavailable; the theme still applies for this visit.
      }
      const theme = resolve(next);
      apply(theme);
      set({ mode: next, theme });
    },
    setContrast: (contrast) => {
      document.documentElement.classList.toggle('high-contrast', contrast);
      set({ contrast });
    },
  };
});
/** Colors that canvas and WebGL drawing need as literal values. */
export const palette = {
  dark: {
    surface: '#121726',
    text: '#eef1f8',
    muted: '#a3adc2',
    grid: '#2b3550',
    gridMinor: '#1c2438',
    axis: '#5a6582',
    wire: '#0b1124',
    marker: '#ffd08a',
    start: '#ffffff',
  },
  light: {
    surface: '#ffffff',
    text: '#1a1d29',
    muted: '#596075',
    grid: '#c9c4b6',
    gridMinor: '#e3dfd3',
    axis: '#8f8a7c',
    wire: '#1a2040',
    marker: '#b4570a',
    start: '#1a1d29',
  },
};
