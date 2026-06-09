import { describe, expect, it, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';

import { ThemeService } from './theme.service';

const THEME_KEY = 'SEP_THEME';

describe('ThemeService', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove('dark');
    TestBed.configureTestingModule({});
  });

  it('inicia em light quando nao ha preferencia salva', () => {
    const service = TestBed.inject(ThemeService);

    expect(service.theme()).toBe('light');
    expect(service.isDark()).toBe(false);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('le o tema salvo no localStorage ao inicializar', () => {
    window.localStorage.setItem(THEME_KEY, 'dark');

    const service = TestBed.inject(ThemeService);

    expect(service.isDark()).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('toggle alterna o tema, aplica a classe e persiste', () => {
    const service = TestBed.inject(ThemeService);

    service.toggle();

    expect(service.theme()).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(window.localStorage.getItem(THEME_KEY)).toBe('dark');

    service.toggle();

    expect(service.theme()).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(window.localStorage.getItem(THEME_KEY)).toBe('light');
  });

  it('setTheme aplica e persiste o tema informado', () => {
    const service = TestBed.inject(ThemeService);

    service.setTheme('dark');

    expect(service.isDark()).toBe(true);
    expect(window.localStorage.getItem(THEME_KEY)).toBe('dark');
  });
});
