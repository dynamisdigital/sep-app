import { importProvidersFrom } from '@angular/core';
import { fireEvent, render, screen } from '@testing-library/angular';
import { LucideAngularModule } from 'lucide-angular';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LUCIDE_ICONS } from '../../../core/icons/lucide-icons';
import { OuvirTextoComponent } from './ouvir-texto.component';

// Nenhum teste fala de verdade: a voz é substituída por um espião. O que se confere é o que o componente
// pede ao navegador (falar, pausar, continuar, cancelar) e que a leitura nunca começa sozinha.
interface FalaFalsa {
  text: string;
  lang: string;
  rate: number;
  onboundary: ((e: { charIndex: number }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
}

function instalarVozFalsa() {
  const faladas: FalaFalsa[] = [];
  class Utterance implements FalaFalsa {
    lang = '';
    rate = 1;
    pitch = 1;
    onboundary: ((e: { charIndex: number }) => void) | null = null;
    voice: unknown = null;
    onend: (() => void) | null = null;
    onerror: ((e: { error: string }) => void) | null = null;
    constructor(public text: string) {}
  }
  const synth = {
    speak: vi.fn((f: FalaFalsa) => faladas.push(f)),
    cancel: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    getVoices: () => [],
    addEventListener: vi.fn(),
  };
  Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
  (globalThis as unknown as Record<string, unknown>)['SpeechSynthesisUtterance'] = Utterance;
  return { synth, faladas };
}

function remover() {
  delete (window as unknown as Record<string, unknown>)['speechSynthesis'];
  delete (globalThis as unknown as Record<string, unknown>)['SpeechSynthesisUtterance'];
}

const montar = (textos: string[]) => {
  const escopo = document.createElement('article');
  escopo.innerHTML = textos.map((t) => `<p>${t}</p>`).join('');
  document.body.appendChild(escopo);
  return render(OuvirTextoComponent, {
    inputs: { escopo, seletor: 'p', chave: 'a' },
    providers: [importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS))],
  });
};

describe('OuvirTextoComponent', () => {
  afterEach(() => {
    remover();
    document.body.innerHTML = '';
  });

  describe('com voz disponível', () => {
    let voz: ReturnType<typeof instalarVozFalsa>;
    beforeEach(() => {
      voz = instalarVozFalsa();
    });

    it('nunca começa sozinho: só fala depois do clique em Ouvir', async () => {
      await montar(['Primeiro trecho.', 'Segundo trecho.']);
      expect(voz.synth.speak).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole('button', { name: /Ouvir/ }));
      expect(voz.faladas).toHaveLength(1);
      expect(voz.faladas[0].text).toBe('Primeiro trecho.');
      expect(voz.faladas[0].lang).toBe('pt-BR');
    });

    it('passa de um trecho ao seguinte e termina sozinho', async () => {
      const { fixture } = await montar(['Um.', 'Dois.', 'Três.']);
      fireEvent.click(screen.getByRole('button', { name: /Ouvir/ }));

      voz.faladas[0].onend?.();
      fixture.detectChanges();
      expect(voz.faladas.map((f) => f.text)).toEqual(['Um.', 'Dois.']);
      expect(screen.getByRole('status').textContent).toContain('trecho 2 de 3');

      voz.faladas[1].onend?.();
      voz.faladas[2].onend?.();
      fixture.detectChanges();
      expect(screen.getByRole('button', { name: /Ouvir/ })).toBeTruthy();
    });

    it('pausa e continua pelo navegador, sem recomeçar do início', async () => {
      await montar(['Um.', 'Dois.']);
      fireEvent.click(screen.getByRole('button', { name: /Ouvir/ }));

      fireEvent.click(screen.getByRole('button', { name: /Pausar/ }));
      expect(voz.synth.pause).toHaveBeenCalled();
      expect(screen.getByRole('status').textContent).toContain('pausada');

      fireEvent.click(screen.getByRole('button', { name: /Continuar/ }));
      expect(voz.synth.resume).toHaveBeenCalled();
      expect(voz.faladas).toHaveLength(1);
    });

    it('parar cancela a voz, volta ao início e um trecho cancelado não avança a fila', async () => {
      await montar(['Um.', 'Dois.']);
      fireEvent.click(screen.getByRole('button', { name: /Ouvir/ }));
      const primeira = voz.faladas[0];

      fireEvent.click(screen.getByRole('button', { name: /Parar/ }));
      expect(voz.synth.cancel).toHaveBeenCalled();
      expect(screen.getByRole('button', { name: /Ouvir/ })).toBeTruthy();

      // O cancelamento dispara `onerror` e, às vezes, `onend` da fala antiga: nada disso pode falar de novo.
      primeira.onerror?.({ error: 'canceled' });
      primeira.onend?.();
      expect(voz.faladas).toHaveLength(1);
    });

    it('trocar a velocidade relê o trecho atual na nova velocidade', async () => {
      await montar(['Um.', 'Dois.']);
      fireEvent.click(screen.getByRole('button', { name: /Ouvir/ }));
      expect(voz.faladas[0].rate).toBeCloseTo(1.02, 5);

      fireEvent.change(screen.getByLabelText('Velocidade'), { target: { value: '1.3' } });
      expect(voz.faladas[1].text).toBe('Um.');
      expect(voz.faladas[1].rate).toBeCloseTo(1.326, 5);
    });
  });

  it('sem voz no navegador, avisa e não oferece botões', async () => {
    await montar(['Um.']);
    expect(screen.getByText(/não oferece leitura em áudio/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Ouvir/ })).toBeNull();
  });
});
