import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

const THEME_KEY = 'SEP_THEME';

/**
 * Servico de tema do New Design System SEP (F-Sprint 14).
 *
 * Alterna entre claro e escuro aplicando a classe `.dark` no elemento raiz do
 * documento. A preferencia e persistida em `localStorage` (chave unica, sem
 * persistencia complexa). No primeiro acesso sem valor salvo, respeita o
 * `prefers-color-scheme` do sistema operacional.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly themeState = signal<Theme>(this.resolveInitialTheme());

  readonly theme = this.themeState.asReadonly();
  readonly isDark = computed(() => this.themeState() === 'dark');

  constructor() {
    this.applyTheme(this.themeState());
  }

  toggle(): void {
    this.setTheme(this.themeState() === 'dark' ? 'light' : 'dark');
  }

  setTheme(theme: Theme): void {
    this.themeState.set(theme);
    this.applyTheme(theme);
    this.persist(theme);
  }

  private applyTheme(theme: Theme): void {
    const root = this.document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
  }

  private resolveInitialTheme(): Theme {
    const stored = this.readStored();
    if (stored) {
      return stored;
    }
    const prefersDark = this.document.defaultView?.matchMedia?.(
      '(prefers-color-scheme: dark)',
    ).matches;
    return prefersDark ? 'dark' : 'light';
  }

  private readStored(): Theme | null {
    const value = this.document.defaultView?.localStorage.getItem(THEME_KEY);
    return value === 'dark' || value === 'light' ? value : null;
  }

  private persist(theme: Theme): void {
    this.document.defaultView?.localStorage.setItem(THEME_KEY, theme);
  }
}
