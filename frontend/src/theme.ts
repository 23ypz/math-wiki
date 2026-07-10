import { ref } from 'vue';

export type ThemeMode = 'light' | 'dark' | 'system';
const STORAGE_KEY = 'math-wiki-theme';
export const themeMode = ref<ThemeMode>((localStorage.getItem(STORAGE_KEY) as ThemeMode) || 'system');

function resolved(mode: ThemeMode) {
  if (mode !== 'system') return mode;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(mode = themeMode.value) {
  themeMode.value = mode;
  localStorage.setItem(STORAGE_KEY, mode);
  document.documentElement.dataset.theme = resolved(mode);
}

export function cycleTheme() {
  const modes: ThemeMode[] = ['light', 'dark', 'system'];
  applyTheme(modes[(modes.indexOf(themeMode.value) + 1) % modes.length]);
}

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (themeMode.value === 'system') applyTheme('system');
});
