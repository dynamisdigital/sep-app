import { describe, expect, it } from 'vitest';
import { ShowcaseComponent } from './showcase.component';
import { DESIGN_SYSTEM_ROUTES } from './design-system.routes';

// Smoke test pattern aligned with F-Sprint 0 (validate class definidas, evita carga de Ionic/templates).
describe('ShowcaseComponent', () => {
  it('classe esta definida', () => {
    expect(ShowcaseComponent).toBeDefined();
  });
});

describe('DESIGN_SYSTEM_ROUTES', () => {
  it('expoe rota base e rota :system', () => {
    expect(DESIGN_SYSTEM_ROUTES).toHaveLength(2);
    expect(DESIGN_SYSTEM_ROUTES[0].path).toBe('');
    expect(DESIGN_SYSTEM_ROUTES[1].path).toBe(':system');
    expect(DESIGN_SYSTEM_ROUTES[0].component).toBe(ShowcaseComponent);
    expect(DESIGN_SYSTEM_ROUTES[1].component).toBe(ShowcaseComponent);
  });
});
