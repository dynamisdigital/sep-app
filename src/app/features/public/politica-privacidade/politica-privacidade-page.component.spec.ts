import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';

import { PoliticaPrivacidadePageComponent } from './politica-privacidade-page.component';

/**
 * O que esta pagina promete e um **inventario**, nao uma redacao: se o app passar a gravar algo que
 * nao esta aqui, ou parar de gravar algo que esta, o texto vira declaracao falsa — e falsa num
 * documento juridico.
 *
 * Por isso a trava e por **identificador** (`sep-refresh`, `SEP_ACCESS_TOKEN`, ...) e por **papel
 * semantico** (landmark, headings, o `note` da pendencia), nunca por prosa colada. A F-24.7 mediu o
 * custo do caminho oposto na `account-locked`: comparar blocos de texto inteiros fazia reformatacao
 * pura de template — a que o proprio prettier aplica — derrubar teste sem que uma letra da copy
 * mudasse. Aqui a copy vai ser reescrita pelo juridico, entao amarra-la seria garantir quebra.
 *
 * O assert de AUSENCIA do `NG_APP_USE_MSW` e o unico que nao protege o leitor, e sim o documento:
 * a chave existe no repo (`main.ts:9`) e e a mais facil de varrer para dentro por engano numa
 * revisao futura. Ela nao existe em build de producao; cita-la seria descrever ao usuario um
 * artefato que ele nunca tera.
 */
const CHAVES_DECLARADAS = [
  'SEP_ACCESS_TOKEN',
  'SEP_PENDING_MFA_CHALLENGE',
  'SEP_THEME',
  'SEP_AVISO_COOKIES',
];

async function renderizar() {
  return render(PoliticaPrivacidadePageComponent, { providers: [provideRouter([])] });
}

describe('PoliticaPrivacidadePageComponent', () => {
  it('expoe landmark e heading da pagina', async () => {
    await renderizar();

    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: /politica de privacidade e cookies/i }),
    ).toBeInTheDocument();
  });

  it('move o foco para o heading, como as demais telas publicas de desfecho', async () => {
    await renderizar();

    const titulo = screen.getByRole('heading', { level: 1 });
    expect(document.activeElement).toBe(titulo);
  });

  it('anuncia que o texto ainda nao passou por revisao juridica', async () => {
    await renderizar();

    const aviso = screen.getByRole('note');
    expect(aviso).toHaveTextContent(/pendente de revisao juridica/i);
  });

  it('nomeia as secoes que ainda faltam, em vez de omitir a lacuna', async () => {
    await renderizar();

    const pendencias = screen.getByRole('list');
    expect(pendencias).toHaveTextContent(/base legal/i);
    expect(pendencias).toHaveTextContent(/direitos do titular/i);
    expect(pendencias).toHaveTextContent(/encarregado/i);
  });

  it('declara o unico cookie do produto e suas propriedades', async () => {
    const { container } = await renderizar();
    const texto = container.textContent ?? '';

    expect(texto).toContain('sep-refresh');
    expect(texto).toContain('HttpOnly');
    expect(texto).toContain('/api/v1/auth');
    expect(texto).toContain('30 dias');
  });

  it('declara cada chave que o app grava no navegador', async () => {
    const { container } = await renderizar();
    const texto = container.textContent ?? '';

    for (const chave of CHAVES_DECLARADAS) {
      expect(texto).toContain(chave);
    }
  });

  it('nao cita a chave que so existe em desenvolvimento', async () => {
    const { container } = await renderizar();

    expect(container.textContent ?? '').not.toContain('NG_APP_USE_MSW');
  });

  it('explica por que nao ha opcao de recusa, em vez de omitir', async () => {
    await renderizar();

    expect(
      screen.getByRole('heading', { level: 2, name: /por que nao ha opcao de recusar/i }),
    ).toBeInTheDocument();
  });

  it('afirma a ausencia de rastreamento de terceiros', async () => {
    await renderizar();

    expect(
      screen.getByRole('heading', { level: 2, name: /rastreamento de terceiros/i }),
    ).toBeInTheDocument();
  });

  it('nao faz chamada de rede: e alcancavel por URL direta, sem sessao', async () => {
    // O `onUnhandledRequest: 'error'` do test-setup.ts:21 transforma qualquer request nao mockada em
    // falha. Renderizar sem handler nenhum e, por si, a prova de que a pagina nao chama a API.
    await expect(renderizar()).resolves.toBeTruthy();
  });
});
