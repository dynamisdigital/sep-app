import { provideHttpClient } from '@angular/common/http';
import { Component, importProvidersFrom } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { LUCIDE_ICONS } from '../../../core/icons/lucide-icons';
import { render, screen } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';

import { PublicShellComponent } from './public-shell.component';

async function montar() {
  return render(PublicShellComponent, {
    providers: [
      importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
      provideRouter([]),
      provideHttpClient(),
    ],
  });
}

function hrefs(seletor: string): string[] {
  return Array.from(document.querySelectorAll(`${seletor} a[href]`)).map(
    (e) => e.getAttribute('href') ?? '',
  );
}

describe('PublicShellComponent', () => {
  // Antes o menu apontava para âncoras da própria landing, e "Privacidade" e "Termos de uso"
  // iam para `/` sem fragmento: dois links que não levavam a lugar nenhum.
  it('o menu leva às telas institucionais, e não a âncoras', async () => {
    await montar();

    expect(hrefs('.site-nav')).toEqual([
      '/credito-pj',
      '/investidores',
      '/como-funciona',
      '/seguranca',
      '/transparencia',
      '/blog',
      '/sobre-o-sep',
      '/contato',
    ]);
  });

  it('o rodapé leva aos documentos legais', async () => {
    await montar();

    const links = hrefs('.site-footer-links');
    expect(links).toContain('/termos-de-uso');
    expect(links).toContain('/politica-de-privacidade');
    expect(links.every((h) => h !== '/')).toBe(true);
  });

  it('mantém a marca e o acesso à plataforma', async () => {
    await montar();

    expect(screen.getByRole('link', { name: 'Entrar' }).getAttribute('href')).toBe('/login');
    expect(screen.getByLabelText('Dynamis SEP - Página inicial').getAttribute('href')).toBe('/');
  });

  it('o rodapé declara o regime e o aviso de não garantia', async () => {
    await montar();

    const legal = document.querySelector('.site-legal')?.textContent ?? '';
    expect(legal).toContain('5.050/2022');
    expect(legal).toContain('rendimento garantido');
    expect(legal).toContain('FGC');
  });

  it('mostra no topo o aviso antifraude e a entrada da área do investidor', async () => {
    await montar();

    const topo = hrefs('.site-topbar');
    expect(topo).toContain('/antifraude');
    expect(topo).toContain('/login');
    expect(document.querySelector('.site-topbar')?.textContent).toContain('Área do investidor');
    expect(document.querySelector('.site-topbar')?.textContent).toContain(
      'nunca pede pagamento antecipado',
    );
  });

  it('o rodapé leva às páginas de confiança: perguntas, antifraude, transparência e blog', async () => {
    await montar();

    const links = hrefs('.site-footer-links');
    for (const rota of ['/perguntas-frequentes', '/antifraude', '/transparencia', '/blog']) {
      expect(links).toContain(rota);
    }
  });

  it('a seta de voltar não aparece na inicial e aparece nas demais páginas', async () => {
    @Component({ template: '' })
    class Vazia {}
    const { fixture } = await render(PublicShellComponent, {
      providers: [
        importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
        provideRouter([{ path: 'blog', component: Vazia }]),
        provideHttpClient(),
      ],
    });
    expect(screen.queryByRole('button', { name: 'Voltar para a tela anterior' })).toBeNull();

    await TestBed.inject(Router).navigateByUrl('/blog');
    fixture.detectChanges();
    expect(screen.getByRole('button', { name: 'Voltar para a tela anterior' })).toBeTruthy();
  });
});
