import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/angular';
import { provideRouter } from '@angular/router';
import { importProvidersFrom } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { LandingComponent } from './landing.component';
import { LUCIDE_ICONS } from '../../../core/icons/lucide-icons';

describe('LandingComponent', () => {
  it('renderiza headline principal', async () => {
    await render(LandingComponent, {
      providers: [provideRouter([]), importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS))],
    });

    expect(
      screen.getByRole('heading', { level: 1, name: /capital de giro com experiencia simples/i }),
    ).toBeTruthy();
  });

  it('expoe links para /login e /register', async () => {
    await render(LandingComponent, {
      providers: [provideRouter([]), importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS))],
    });

    const loginLinks = screen.getAllByRole('link', { name: /entrar/i });
    const registerLinks = screen.getAllByRole('link', { name: /criar conta/i });

    expect(loginLinks.length).toBeGreaterThan(0);
    expect(registerLinks.length).toBeGreaterThan(0);
  });

  it('expoe secao de seguranca/escrow', async () => {
    await render(LandingComponent, {
      providers: [provideRouter([]), importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS))],
    });

    expect(screen.getByRole('heading', { name: /seguranca por desenho/i })).toBeTruthy();
    expect(screen.getAllByText(/escrow/i).length).toBeGreaterThan(0);
  });
  /**
   * O rodape e o unico ponto da landing que leva a politica, entao o teste guarda as DUAS coisas: o
   * link novo existe e aponta para a rota certa, e os dois preexistentes continuam la. Sem a segunda
   * metade, uma edicao futura poderia trocar um link pelo outro em vez de acrescentar, e o teste do
   * link novo ficaria verde enquanto a landing perdia "Entrar".
   *
   * O rotulo "Criar conta" e reconhecidamente enganoso (promete formulario e entrega pagina
   * informativa) e segue registrado como follow-up aberto no STATE.md. Nao e corrigido aqui de
   * proposito: arrastar correcao alheia para dentro da sprint apaga o recorte.
   */
  it('leva a politica de privacidade pelo rodape, sem perder os links existentes', async () => {
    const { container } = await render(LandingComponent, {
      providers: [provideRouter([]), importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS))],
    });

    // Escopado ao rodape de proposito. Medido por mutacao: com `screen` global, apagar o "Entrar" do
    // rodape passava verde, porque a landing tem outro "Entrar" no hero. A guarda so vale se olhar
    // exatamente o conjunto de links que a Task tocou.
    const rodape = container.querySelector('.landing-footer');
    expect(rodape).not.toBeNull();
    const linksDoRodape = within(rodape as HTMLElement);

    const politica = linksDoRodape.getByRole('link', {
      name: /politica de privacidade e cookies/i,
    });
    expect(politica.getAttribute('href')).toBe('/politica-de-privacidade');

    expect(linksDoRodape.getByRole('link', { name: /^entrar$/i })).toBeInTheDocument();
    expect(linksDoRodape.getByRole('link', { name: /^criar conta$/i })).toBeInTheDocument();
  });
});
