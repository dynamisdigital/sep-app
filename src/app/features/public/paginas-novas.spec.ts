import { provideHttpClient } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { fireEvent, render, screen } from '@testing-library/angular';
import { LucideAngularModule } from 'lucide-angular';
import { of } from 'rxjs';
import { describe, expect, it } from 'vitest';

import { LUCIDE_ICONS } from '../../core/icons/lucide-icons';
import { AntifraudeComponent } from './antifraude/antifraude.component';
import { BlogArtigoComponent } from './blog-artigo/blog-artigo.component';
import { BlogComponent } from './blog/blog.component';
import { InvestidoresComponent } from './investidores/investidores.component';
import { PerguntasFrequentesComponent } from './perguntas-frequentes/perguntas-frequentes.component';
import { POSTS } from './shared/site-blog';
import { TransparenciaComponent } from './transparencia/transparencia.component';

const base = [
  importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
  provideRouter([]),
  provideHttpClient(),
];

function hrefs(): string[] {
  return Array.from(document.querySelectorAll('a[href]')).map((a) => a.getAttribute('href') ?? '');
}

describe('páginas novas do site', () => {
  it('Para investidores: abre com o aviso de risco e leva ao cadastro', async () => {
    await render(InvestidoresComponent, { providers: base });

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /financie empresas e acompanhe cada parcela/i,
      }),
    ).toBeTruthy();
    const aviso = screen.getByRole('note').textContent ?? '';
    expect(aviso).toContain('FGC');
    expect(aviso).toContain('perda do capital');
    expect(hrefs()).toContain('/register');
    // Pessoas físicas são aceitas, e o limite por tomador aparece com o valor do regimento.
    expect(screen.getByText('Pessoas físicas')).toBeTruthy();
    expect(document.body.textContent).toContain('R$ 15.000,00');
  });

  it('Transparência: não afirma autorização do Banco Central antes de existir a referência', async () => {
    await render(TransparenciaComponent, { providers: base });

    const texto = document.body.textContent ?? '';
    expect(texto).toContain('Em atualização');
    expect(texto).not.toMatch(/autorizad[oa] (pelo|a funcionar pelo) Banco Central/i);
    // A tarifa de originação sai da política de crédito, e a inadimplência por faixa não é inventada.
    expect(texto).toContain('4% do valor contratado');
    expect(screen.getAllByText('Faixa A').length).toBe(1);
    expect(screen.getByText(/Ainda não há carteira com 12 meses/)).toBeTruthy();
  });

  it('Antifraude: lista o que a plataforma nunca faz e os canais oficiais', async () => {
    await render(AntifraudeComponent, { providers: base });

    expect(screen.getByText('Nunca pedimos pagamento antecipado')).toBeTruthy();
    expect(screen.getByText('Canais oficiais')).toBeTruthy();
    expect(hrefs()).toContain('/contato');
  });

  it('Perguntas frequentes: a busca ignora acentos e diz quando não acha', async () => {
    await render(PerguntasFrequentesComponent, { providers: base });

    const antes = document.querySelectorAll('details').length;
    expect(antes).toBeGreaterThanOrEqual(15);

    const campo = screen.getByRole('searchbox');
    fireEvent.input(campo, { target: { value: 'automatico' } });
    expect(document.querySelectorAll('details').length).toBeLessThan(antes);
    expect(document.querySelectorAll('details').length).toBeGreaterThan(0);

    fireEvent.input(campo, { target: { value: 'palavra-que-nao-existe-xyz' } });
    expect(document.querySelectorAll('details').length).toBe(0);
    expect(screen.getByText(/Nenhuma resposta para/)).toBeTruthy();
  });

  it('Blog: lista todos os textos, filtra por categoria e liga cada um ao seu endereço', async () => {
    await render(BlogComponent, { providers: base });

    const links = hrefs().filter((h) => h.startsWith('/blog/'));
    expect(links.length).toBe(POSTS.length);

    fireEvent.click(screen.getByRole('button', { name: /Segurança/ }));
    const depois = hrefs().filter((h) => h.startsWith('/blog/'));
    const seguranca = POSTS.filter((p) => p.categoria === 'Segurança').length;
    expect(depois.length).toBe(seguranca);
    expect(document.body.textContent).toContain('Conteúdo informativo');
  });

  it('Texto do blog: mostra o conteúdo, o resumo, o aviso e os relacionados', async () => {
    const post = POSTS[0];
    await render(BlogArtigoComponent, {
      providers: [
        ...base,
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap({ slug: post.slug }) },
            paramMap: of(convertToParamMap({ slug: post.slug })),
          },
        },
      ],
    });

    expect(screen.getByRole('heading', { level: 1, name: post.titulo })).toBeTruthy();
    expect(screen.getByText('Em resumo')).toBeTruthy();
    expect(document.body.textContent).toContain('Conteúdo informativo');
    const rel = hrefs().filter((h) => h.startsWith('/blog/'));
    expect(rel.length).toBe(post.relacionados.length);
  });

  it('Texto do blog: endereço desconhecido mostra "não encontrado" com caminho de volta', async () => {
    await render(BlogArtigoComponent, {
      providers: [
        ...base,
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap({ slug: 'nao-existe' }) },
            paramMap: of(convertToParamMap({ slug: 'nao-existe' })),
          },
        },
      ],
    });

    expect(screen.getByRole('heading', { level: 1, name: 'Texto não encontrado' })).toBeTruthy();
    expect(hrefs()).toContain('/blog');
  });
});
