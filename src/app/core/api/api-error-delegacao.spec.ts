import { HttpErrorResponse } from '@angular/common/http';
import { describe, expect, it } from 'vitest';

import { mensagemBackofficeErro } from '../../features/authenticated/backoffice/shared/backoffice-format';
import { mensagemCobrancaErro } from '../../features/authenticated/cobranca/shared/cobranca-format';
import { mensagemCreditoErro } from '../../features/authenticated/credito/shared/credito-error';
import { mensagemCredoraErro } from '../../features/authenticated/credora/shared/credora-format';
import { mensagemFormalizacaoErro } from '../../features/authenticated/formalizacao/shared/formalizacao-format';
import { mensagemOnboardingErro } from '../../features/authenticated/onboarding/shared/onboarding-error';
import { mensagemPixErro } from '../../features/authenticated/pix/shared/pix-format';

/**
 * Os 7 helpers de dominio delegam a `mensagemDeErroDaApi` desde a F-Sprint 22. Antes disso cada um
 * repetia o mesmo corpo de duas linhas, e **nenhum tinha teste unitario** — eram exercitados so
 * atraves de componentes.
 *
 * Este spec existe porque a cobertura por componente e desigual: medida por mutacao, trocar o corpo
 * de `mensagemFormalizacaoErro`, `mensagemOnboardingErro` ou `mensagemCreditoErro` por `padrao` nao
 * deixava NENHUM teste vermelho. A delegacao desses tres ficaria sem prova.
 */
const HELPERS: readonly (readonly [string, (e: HttpErrorResponse, p: string) => string])[] = [
  ['mensagemOnboardingErro', mensagemOnboardingErro],
  ['mensagemCreditoErro', mensagemCreditoErro],
  ['mensagemBackofficeErro', mensagemBackofficeErro],
  ['mensagemCobrancaErro', mensagemCobrancaErro],
  ['mensagemCredoraErro', mensagemCredoraErro],
  ['mensagemFormalizacaoErro', mensagemFormalizacaoErro],
  ['mensagemPixErro', mensagemPixErro],
];

const PADRAO = 'Nao foi possivel concluir a operacao.';

describe('delegacao dos helpers de erro de dominio', () => {
  it.each(HELPERS)('%s usa o message do corpo da API', (_nome, helper) => {
    const erro = new HttpErrorResponse({
      error: { message: 'Regra de dominio violada.' },
      status: 409,
    });

    expect(helper(erro, PADRAO)).toBe('Regra de dominio violada.');
  });

  it.each(HELPERS)('%s cai no padrao quando nao ha corpo', (_nome, helper) => {
    const erro = new HttpErrorResponse({ error: null, status: 504 });

    expect(helper(erro, PADRAO)).toBe(PADRAO);
  });
});
