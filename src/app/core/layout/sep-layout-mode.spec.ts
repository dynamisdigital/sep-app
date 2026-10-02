import { Component, signal } from '@angular/core';
import { render } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';

import { SepLayoutModeDirective } from './sep-layout-mode.directive';
import { SEP_LAYOUT_LIMITES, sepModoPorLargura } from './sep-layout-mode';

@Component({
  selector: 'sep-hospedeira',
  imports: [SepLayoutModeDirective],
  template: `<section [sepLayoutMode]="modo()" #alvo="sepLayoutMode">{{ alvo.modo() }}</section>`,
})
class HospedeiraComponent {
  readonly modo = signal<'auto' | 'full' | 'half' | 'third'>('auto');
}

describe('contrato responsivo full/half/third', () => {
  it('resolve o modo pela largura disponivel, e nao pela janela', () => {
    expect(sepModoPorLargura(1600)).toBe('full');
    expect(sepModoPorLargura(SEP_LAYOUT_LIMITES.half)).toBe('full');
    expect(sepModoPorLargura(SEP_LAYOUT_LIMITES.half - 1)).toBe('half');
    expect(sepModoPorLargura(SEP_LAYOUT_LIMITES.third)).toBe('half');
    expect(sepModoPorLargura(SEP_LAYOUT_LIMITES.third - 1)).toBe('third');
    expect(sepModoPorLargura(0)).toBe('third');
  });

  // O mesmo componente pode ocupar um terço de um 4K e a tela inteira de um notebook estreito:
  // o contrato descreve espaço, e não classe de dispositivo.
  it('a largura decide sozinha, sem referencia a viewport', () => {
    const umTercoDe4K = 3840 / 3;
    expect(sepModoPorLargura(umTercoDe4K)).toBe('full');
    expect(sepModoPorLargura(560)).toBe('third');
  });

  it('publica o modo como atributo, para o CSS', async () => {
    await render(HospedeiraComponent);
    const alvo = document.querySelector('section');
    expect(alvo?.getAttribute('data-sep-modo')).toBeTruthy();
  });

  // Precedencia declarada: override explicito vence o modo automatico.
  it('override explicito vence a medicao', async () => {
    const { fixture } = await render(HospedeiraComponent);
    fixture.componentInstance.modo.set('third');
    fixture.detectChanges();

    const alvo = document.querySelector('section');
    expect(alvo?.getAttribute('data-sep-modo')).toBe('third');
    expect(alvo?.textContent?.trim()).toBe('third');
  });

  it('voltar para auto devolve a decisao ao componente', async () => {
    const { fixture } = await render(HospedeiraComponent);
    fixture.componentInstance.modo.set('half');
    fixture.detectChanges();
    expect(document.querySelector('section')?.getAttribute('data-sep-modo')).toBe('half');

    fixture.componentInstance.modo.set('auto');
    fixture.detectChanges();
    // Sem largura real no ambiente de teste, a medicao cai em `third`; o que importa e que
    // deixou de obedecer ao override.
    expect(document.querySelector('section')?.getAttribute('data-sep-modo')).not.toBe('half');
  });

  it('trocar de modo varias vezes nao deixa estado preso', async () => {
    const { fixture } = await render(HospedeiraComponent);
    for (const m of ['full', 'third', 'half', 'full'] as const) {
      fixture.componentInstance.modo.set(m);
      fixture.detectChanges();
      expect(document.querySelector('section')?.getAttribute('data-sep-modo')).toBe(m);
    }
  });
});
