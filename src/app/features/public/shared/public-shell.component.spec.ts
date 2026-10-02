import { importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { LUCIDE_ICONS } from '../../../core/icons/lucide-icons';
import { render, screen } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';

import { PublicShellComponent } from './public-shell.component';

async function montar() {
  return render(PublicShellComponent, {
    providers: [importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)), provideRouter([])],
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
  it('o menu leva às cinco telas institucionais, e não a âncoras', async () => {
    await montar();

    expect(hrefs('.site-nav')).toEqual([
      '/credito-pj',
      '/seguranca',
      '/como-funciona',
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
    expect(screen.getByLabelText('SEP - Página inicial').getAttribute('href')).toBe('/');
  });

  it('o rodapé declara o regime e o aviso de não garantia', async () => {
    await montar();

    const legal = document.querySelector('.site-legal')?.textContent ?? '';
    expect(legal).toContain('4.656/2018');
    expect(legal).toContain('não oferece rendimento garantido');
  });
});
