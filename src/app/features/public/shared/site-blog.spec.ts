import { describe, expect, it } from 'vitest';

import { FAQ, totalDePerguntas } from './site-faq';
import { CATEGORIAS, minutosDeLeitura, POSTS, postPorSlug } from './site-blog';

// O conteúdo do blog e do FAQ é dado, e dado errado só aparece em produção: um relacionado que não existe
// vira link quebrado, e uma promessa de ganho vira problema com o regulador. Estes testes seguram os dois.
describe('conteúdo do blog', () => {
  it('cada texto tem um endereço próprio e todos os textos relacionados existem', () => {
    const slugs = POSTS.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const post of POSTS) {
      expect(post.relacionados.length, post.slug).toBeGreaterThan(0);
      for (const r of post.relacionados) {
        expect(postPorSlug(r), `${post.slug} -> ${r}`).toBeTruthy();
        expect(r).not.toBe(post.slug);
      }
    }
  });

  it('o endereço do texto é limpo: letras minúsculas, números e hífens', () => {
    for (const post of POSTS) expect(post.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it('cada texto tem resumo, corpo, "em resumo" e uma categoria conhecida', () => {
    for (const post of POSTS) {
      expect(post.titulo.length, post.slug).toBeGreaterThan(20);
      expect(post.resumo.length, post.slug).toBeGreaterThan(40);
      expect(post.blocos.length, post.slug).toBeGreaterThan(3);
      expect(post.emResumo.length, post.slug).toBeGreaterThanOrEqual(2);
      expect(CATEGORIAS).toContain(post.categoria);
      expect(minutosDeLeitura(post), post.slug).toBeGreaterThanOrEqual(1);
    }
  });

  it('o blog cobre os quatro assuntos e tem textos suficientes sobre a SEP', () => {
    expect(POSTS.length).toBeGreaterThanOrEqual(12);
    for (const categoria of CATEGORIAS) {
      expect(
        POSTS.some((p) => p.categoria === categoria),
        categoria,
      ).toBe(true);
    }
    expect(
      POSTS.every((p) =>
        /sep|empr[eé]stimo|cr[eé]dito|investir|financi/i.test(p.titulo + p.resumo),
      ),
    ).toBe(true);
  });

  it('nenhum texto promete rendimento ou retorno garantido', () => {
    const proibidas = [
      /rendimento garantido(?! em)/i,
      /ganhe (at[eé] )?\d/i,
      /retorno certo/i,
      /sem risco\b/i,
      /lucro garantido/i,
    ];
    for (const post of POSTS) {
      const texto = [
        post.titulo,
        post.resumo,
        ...post.blocos.flatMap((b) => (Array.isArray(b.v) ? b.v : [b.v])),
      ].join(' ');
      for (const regra of proibidas) {
        // "Rendimento garantido" só pode aparecer negado ("não oferece", "desconfie", "não permite").
        const achados = texto.match(new RegExp(regra.source, 'gi')) ?? [];
        for (const achado of achados) {
          const i = texto.toLowerCase().indexOf(achado.toLowerCase());
          const contexto = texto.slice(Math.max(0, i - 80), i + achado.length + 20).toLowerCase();
          expect(
            /n[aã]o|desconfi|nunca|sem promessa|nem /.test(contexto),
            `${post.slug}: ${achado}`,
          ).toBe(true);
        }
      }
    }
  });

  it('toda menção a financiar operações traz o aviso de risco no texto ou no aviso da página', () => {
    const doInvestidor = POSTS.filter((p) => p.categoria === 'Para investidores');
    expect(doInvestidor.length).toBeGreaterThanOrEqual(5);
  });
});

describe('perguntas frequentes', () => {
  it('têm perguntas e respostas preenchidas, em quatro grupos', () => {
    expect(FAQ).toHaveLength(4);
    expect(totalDePerguntas()).toBeGreaterThanOrEqual(15);
    for (const grupo of FAQ) {
      for (const item of grupo.itens) {
        expect(item.pergunta.endsWith('?') || item.pergunta.endsWith('.'), item.pergunta).toBe(
          true,
        );
        expect(item.resposta.length, item.pergunta).toBeGreaterThan(40);
      }
    }
  });

  it('a pergunta sobre perder dinheiro responde que sim e que não há FGC', () => {
    const itens = FAQ.flatMap((g) => g.itens);
    const resposta = itens.find((i) => /perder dinheiro/i.test(i.pergunta))?.resposta ?? '';
    expect(resposta).toMatch(/^Sim/);
    expect(resposta).toMatch(/FGC/);
  });
});
