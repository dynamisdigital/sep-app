import { importProvidersFrom } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/angular';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { LandingComponent } from './landing.component';
import { LUCIDE_ICONS } from '../../../core/icons/lucide-icons';

describe('LandingComponent', () => {
  it('renderiza headline principal', async () => {
    await render(LandingComponent, {
      providers: [
        importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
        provideRouter([]),
        provideHttpClient(),
      ],
    });

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /capital de giro para empresas\. crédito com regra para quem financia/i,
      }),
    ).toBeTruthy();
  });

  it('expoe links para /login e /register', async () => {
    await render(LandingComponent, {
      providers: [
        importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
        provideRouter([]),
        provideHttpClient(),
      ],
    });

    const loginLinks = screen.getAllByRole('link', { name: /entrar/i });
    const registerLinks = screen.getAllByRole('link', { name: /criar conta/i });

    expect(loginLinks.length).toBeGreaterThan(0);
    expect(registerLinks.length).toBeGreaterThan(0);
  });

  it('expoe secao de seguranca/escrow', async () => {
    await render(LandingComponent, {
      providers: [
        importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
        provideRouter([]),
        provideHttpClient(),
      ],
    });

    expect(screen.getByRole('heading', { name: /formalização e escrow/i })).toBeTruthy();
    expect(screen.getAllByText(/escrow/i).length).toBeGreaterThan(0);
  });

  it('usa assets extraidos do mockup na landing', async () => {
    await render(LandingComponent, {
      providers: [
        importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
        provideRouter([]),
        provideHttpClient(),
      ],
    });

    expect(screen.getAllByText('Dynamis SEP').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/sociedade de empréstimo entre pessoas/i).length).toBeGreaterThan(0);
    // A marca virou vetor (`sep-logo`): o simbolo le nos dois temas sem arquivo por variante.
    expect(document.querySelector('sep-logo.landing-brand-symbol svg')).toBeTruthy();
    expect(screen.getByRole('button', { name: /tema (claro|escuro)/i })).toBeTruthy();
    expect(document.querySelector('.trust-badges lucide-icon svg')).toBeTruthy();
  });

  describe('banners rotativos', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    async function montar() {
      const r = await render(LandingComponent, {
        providers: [
          importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
          provideRouter([]),
          provideHttpClient(),
        ],
      });
      r.fixture.detectChanges();
      return r;
    }

    const ativos = () =>
      Array.from(document.querySelectorAll('.hero-slide')).map((e) =>
        e.classList.contains('ativo'),
      );
    const indiceAtivo = () => ativos().indexOf(true);

    it('tem quatro banners, só um título principal e nenhum dos cartões antigos', async () => {
      await montar();

      expect(document.querySelectorAll('.hero-slide').length).toBe(4);
      expect(document.querySelectorAll('h1').length).toBe(1);
      expect(document.querySelector('.platform-card')).toBeNull();
      expect(document.querySelectorAll('.hero-midia').length).toBe(4);
      // Cada banner de investimento leva o aviso de risco no próprio banner.
      const textos = Array.from(document.querySelectorAll('.hero-aviso')).map((e) => e.textContent);
      expect(textos.some((t) => /perda do capital/.test(t ?? ''))).toBe(true);
    });

    it('troca sozinho a cada 15 segundos e, depois do último, volta ao primeiro, sem parar', async () => {
      const { fixture } = await montar();
      expect(indiceAtivo()).toBe(0);

      for (const esperado of [1, 2, 3, 0, 1]) {
        vi.advanceTimersByTime(15_000);
        fixture.detectChanges();
        expect(indiceAtivo()).toBe(esperado);
      }
    });

    it('não troca antes dos 15 segundos', async () => {
      const { fixture } = await montar();
      vi.advanceTimersByTime(14_900);
      fixture.detectChanges();
      expect(indiceAtivo()).toBe(0);
    });

    it('durante a troca o anterior sai e o próximo entra juntos, e a saída termina logo depois', async () => {
      const { fixture } = await montar();
      vi.advanceTimersByTime(15_000);
      fixture.detectChanges();

      const slides = Array.from(document.querySelectorAll('.hero-slide'));
      expect(slides[0].classList.contains('saindo')).toBe(true);
      expect(slides[1].classList.contains('ativo')).toBe(true);

      vi.advanceTimersByTime(1_300);
      fixture.detectChanges();
      expect(document.querySelectorAll('.hero-slide.saindo').length).toBe(0);
    });

    it('para enquanto o mouse está sobre o banner e retoma quando sai', async () => {
      const { fixture } = await montar();
      const carrossel = document.querySelector('.hero-carrossel') as HTMLElement;

      fireEvent.mouseEnter(carrossel);
      fixture.detectChanges();
      vi.advanceTimersByTime(60_000);
      fixture.detectChanges();
      expect(indiceAtivo()).toBe(0);

      fireEvent.mouseLeave(carrossel);
      fixture.detectChanges();
      vi.advanceTimersByTime(15_000);
      fixture.detectChanges();
      expect(indiceAtivo()).toBe(1);
    });

    it('o botão de pausa interrompe e retoma a troca automática', async () => {
      const { fixture } = await montar();

      fireEvent.click(screen.getByRole('button', { name: /pausar a troca automática/i }));
      fixture.detectChanges();
      vi.advanceTimersByTime(45_000);
      fixture.detectChanges();
      expect(indiceAtivo()).toBe(0);

      fireEvent.click(screen.getByRole('button', { name: /retomar a troca automática/i }));
      fixture.detectChanges();
      vi.advanceTimersByTime(15_000);
      fixture.detectChanges();
      expect(indiceAtivo()).toBe(1);
    });

    it('os pontos e as setas trocam à mão, e a contagem recomeça do zero', async () => {
      const { fixture } = await montar();
      vi.advanceTimersByTime(10_000);

      fireEvent.click(screen.getByRole('button', { name: /ir para o banner 3 de 4/i }));
      fixture.detectChanges();
      expect(indiceAtivo()).toBe(2);

      // 10 s depois do clique ainda não passou a vez; só aos 15 s.
      vi.advanceTimersByTime(10_000);
      fixture.detectChanges();
      expect(indiceAtivo()).toBe(2);
      vi.advanceTimersByTime(5_000);
      fixture.detectChanges();
      expect(indiceAtivo()).toBe(3);

      fireEvent.click(screen.getByRole('button', { name: /banner anterior/i }));
      fixture.detectChanges();
      expect(indiceAtivo()).toBe(2);
    });

    it('os banners que não estão à vista ficam fora da leitura de tela', async () => {
      await montar();
      const ocultos = Array.from(document.querySelectorAll('.hero-slide')).filter(
        (e) => e.getAttribute('aria-hidden') === 'true',
      );
      expect(ocultos.length).toBe(3);
    });
  });
});
