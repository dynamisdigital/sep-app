import { provideHttpClient } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { render } from '@testing-library/angular';
import { LucideAngularModule } from 'lucide-angular';
import { describe, expect, it } from 'vitest';

import { LUCIDE_ICONS } from '../../../core/icons/lucide-icons';
import { PoliticaDePrivacidadeComponent } from './politica-de-privacidade.component';

/**
 * A seção de cookies é um **inventário**, não uma redação: se o app passar a gravar algo que não
 * está declarada, ou parar de gravar algo que está, o texto vira declaração falsa num documento
 * jurídico.
 *
 * Por isso a trava é por **identificador** (`sep-refresh`, `SEP_ACCESS_TOKEN`, ...), nunca por
 * prosa colada: a copy pode ser reescrita pelo jurídico sem derrubar o teste.
 *
 * O assert de ausência do `NG_APP_USE_MSW` protege o documento: a chave existe no repositório, mas
 * não em build de produção; citá-la descreveria ao usuário um artefato que ele nunca terá.
 */
const CHAVES_DECLARADAS = [
  'SEP_ACCESS_TOKEN',
  'SEP_PENDING_MFA_CHALLENGE',
  'SEP_THEME',
  'SEP_AVISO_COOKIES',
];

async function renderizar() {
  return render(PoliticaDePrivacidadeComponent, {
    providers: [
      importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
      provideRouter([]),
      provideHttpClient(),
    ],
  });
}

describe('PoliticaDePrivacidadeComponent', () => {
  it('declara o único cookie do produto e suas propriedades', async () => {
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

  it('não cita a chave que só existe em desenvolvimento', async () => {
    const { container } = await renderizar();

    expect(container.textContent ?? '').not.toContain('NG_APP_USE_MSW');
  });
});
