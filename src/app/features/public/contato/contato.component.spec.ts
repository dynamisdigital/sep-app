import { importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { fireEvent, render, screen } from '@testing-library/angular';
import { LucideAngularModule } from 'lucide-angular';
import { describe, expect, it } from 'vitest';

import { LUCIDE_ICONS } from '../../../core/icons/lucide-icons';
import { ContatoComponent } from './contato.component';

async function montar() {
  return render(ContatoComponent, {
    providers: [provideRouter([]), importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS))],
  });
}

function preencher(valores: Record<string, string>): void {
  for (const [id, valor] of Object.entries(valores)) {
    const campo = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement;
    fireEvent.input(campo, { target: { value: valor } });
    fireEvent.blur(campo);
  }
}

describe('ContatoComponent', () => {
  it('mostra os canais e o endereço da sede', async () => {
    await montar();

    expect(screen.getByText('contato@dynamisbank.com')).toBeTruthy();
    expect(screen.getByText('(81) 0000-0000')).toBeTruthy();
    expect(document.body.textContent).toContain('Carpina');
  });

  // O mapa é uma consulta por endereço: sem chave de API e sem token pré-gerado, que expira.
  it('embute o mapa da sede e oferece o link externo', async () => {
    const { fixture } = await montar();
    fixture.detectChanges();

    const iframe = document.querySelector('.px53-mapa iframe') as HTMLIFrameElement | null;
    // Sem IntersectionObserver no ambiente de teste o componente mostra o mapa direto; com ele,
    // o embed só entra quando a figura aparece na tela.
    if (iframe) {
      expect(iframe.getAttribute('src')).toContain('output=embed');
      expect(iframe.getAttribute('title')).toContain('Carpina');
    } else {
      // Sem IntersectionObserver funcional, o marcador oferece o carregamento manual.
      expect(document.querySelector('.px53-mapa-espera')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Carregar mapa' })).toBeTruthy();
    }
    expect(screen.getByRole('link', { name: /Abrir no Google Maps/ })).toBeTruthy();
  });

  it('nao envia sem a autorizacao de tratamento de dados', async () => {
    const { fixture } = await montar();

    preencher({
      'ct-nome': 'Maria Souza',
      'ct-email': 'maria@empresa.com',
      'ct-mensagem': 'Preciso de ajuda com uma proposta em análise, contrato 5b771c05.',
    });
    fireEvent.click(screen.getByRole('button', { name: /Enviar mensagem/ }));
    fixture.detectChanges();

    expect(screen.getByText(/Sem a autorização não conseguimos responder/)).toBeTruthy();
    expect(document.querySelector('.px53-sucesso')).toBeNull();
  });

  it('valida e-mail e tamanho minimo da mensagem', async () => {
    const { fixture } = await montar();

    preencher({ 'ct-email': 'nao-e-email', 'ct-mensagem': 'curta' });
    fixture.detectChanges();

    expect(screen.getByText('Informe um e-mail válido.')).toBeTruthy();
    expect(screen.getByText(/ao menos 20 caracteres/)).toBeTruthy();
  });

  // A máscara guarda só os dígitos no controle; o campo mostra o texto formatado.
  it('mascara o telefone e guarda o valor canonico', async () => {
    const { fixture } = await montar();
    const campo = document.getElementById('ct-telefone') as HTMLInputElement;

    fireEvent.input(campo, { target: { value: '81999998888' } });
    fixture.detectChanges();

    expect(campo.value).toBe('(81) 99999-8888');
    expect(fixture.componentInstance['form'].controls.telefone.value).toBe('81999998888');
  });

  // Não há endpoint de contato: em vez de simular um envio que ninguém recebe, a tela diz isso e
  // entrega a mensagem pronta no cliente de e-mail do usuário.
  it('declara a ausencia de endpoint e monta o mailto', async () => {
    const { fixture } = await montar();

    preencher({
      'ct-nome': 'Maria Souza',
      'ct-email': 'maria@empresa.com',
      'ct-mensagem': 'Preciso de ajuda com uma proposta em análise, contrato 5b771c05.',
    });
    fireEvent.click(document.getElementById('ct-consent') as HTMLInputElement);
    fixture.detectChanges();
    fireEvent.click(screen.getByRole('button', { name: /Enviar mensagem/ }));

    await new Promise((resolve) => setTimeout(resolve, 500));
    fixture.detectChanges();

    expect(screen.getByText(/ainda não tem endpoint no backend/)).toBeTruthy();
    const mailto = screen.getByRole('link', { name: /Abrir no meu e-mail/ }).getAttribute('href');
    expect(mailto).toContain('mailto:contato@dynamisbank.com');
    expect(mailto).toContain('Maria%20Souza');
  });
});
