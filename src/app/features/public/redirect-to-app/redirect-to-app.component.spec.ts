import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';

import { RedirectToAppComponent } from './redirect-to-app.component';

describe('RedirectToAppComponent', () => {
  it('expoe a regiao principal nomeada pelo heading', async () => {
    await render(RedirectToAppComponent, { providers: [provideRouter([])] });

    expect(screen.getByRole('main')).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Como cadastrar sua conta' })).toBeTruthy();
  });

  // Esta tela e o destino real de /register desde a Sprint 5, e os 3 links "Criar conta" do login e
  // da landing chegam aqui. O e2e golden-path.spec.ts trava este heading; se o conteudo sumir, o
  // usuario que clicou em "Criar conta" cai numa pagina vazia.
  it('orienta as tres formas de cadastro e oferece volta ao login', async () => {
    await render(RedirectToAppComponent, { providers: [provideRouter([])] });

    expect(screen.getByRole('heading', { name: 'Como cadastrar sua conta' })).toBeTruthy();
    expect(screen.getByText(/tomador/i)).toBeTruthy();
    expect(screen.getByText(/empresa credora/i)).toBeTruthy();
    expect(screen.getByText(/usuario interno/i)).toBeTruthy();
    expect(screen.getByRole('link', { name: /fazer login/i })).toBeTruthy();
  });

  // Nao e destino de redirect automatico (chega-se por routerLink), entao o foco NAO deve ser
  // movido: roubar foco de quem clicou no link atrapalha em vez de ajudar.
  it('nao rouba o foco ao abrir', async () => {
    await render(RedirectToAppComponent, { providers: [provideRouter([])] });

    const heading = screen.getByRole('heading', { name: 'Como cadastrar sua conta' });
    expect(document.activeElement).not.toBe(heading);
  });
});
