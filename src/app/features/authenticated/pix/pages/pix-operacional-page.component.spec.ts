import { provideHttpClient } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { LucideAngularModule } from 'lucide-angular';
import { describe, expect, it } from 'vitest';

import { LUCIDE_ICONS } from '../../../../core/icons/lucide-icons';
import { PixOperacionalPageComponent } from './pix-operacional-page.component';

interface Probe {
  totalVolume: () => number;
  volume: () => { rotulo: string; valor: number; percentual: string }[];
  metricas: () => { chave: string; total: number; hoje: number; valor: number; rota: string }[];
  conciliacao: () => { chave: string; percentual: number; valor: string; nota: string }[];
  alertas: () => { valor: number | null; severidade: string; rota: string }[];
  atividades: () => { valor: number; rota: string }[];
  integracoes: () => { nome: string; estado: string; ativa: boolean }[];
  series: () => { chave: string; valores: readonly number[] }[];
  arco: (percentual: number) => string;
  destacarDia: (indice: number) => void;
  limparDia: () => void;
  detalheDia: () => { dia: string; valores: { rotulo: string; valor: number }[] } | null;
}

function renderPagina() {
  return render(PixOperacionalPageComponent, {
    providers: [
      provideHttpClient(),
      provideRouter([]),
      // O shell operacional injeta AuthService, que depende do HttpClient.
      importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
    ],
  });
}

function probeDe(fixture: ComponentFixture<unknown>): Probe {
  return fixture.componentInstance as unknown as Probe;
}

describe('PixOperacionalPageComponent', () => {
  it('o donut de volume fecha no total e os percentuais somam 100%', async () => {
    const { fixture } = await renderPagina();
    const probe = probeDe(fixture);

    const soma = probe.volume().reduce((total, faixa) => total + faixa.valor, 0);
    expect(soma).toBe(probe.totalVolume());
    expect(probe.totalVolume()).toBe(224);
    expect(probe.volume().map((f) => f.percentual)).toEqual(['39,7%', '50,0%', '10,3%']);
  });

  it('as tres metricas apontam para as sub-rotas Pix reais', async () => {
    const { fixture } = await renderPagina();
    const probe = probeDe(fixture);

    expect(probe.metricas().map((m) => m.rota)).toEqual([
      '/app/pix/desembolsos',
      '/app/pix/recebimentos',
      '/app/pix/divergencias',
    ]);
  });

  it('o arco do medidor nunca usa o caminho longo', async () => {
    const { fixture } = await renderPagina();
    const probe = probeDe(fixture);

    // "M 6 40 A rx ry rotacao large-arc sweep x y": o large-arc e o oitavo termo. Com 1 acima
    // de 50% o navegador desenhava a volta longa e o arco aparecia partido em dois pedacos.
    for (const percentual of [0, 25, 50, 62, 96.8, 100]) {
      const termos = probe.arco(percentual).split(' ');
      expect(termos[7]).toBe('0');
    }
  });

  it('o balao do grafico traz os tres valores do dia apontado', async () => {
    const { fixture } = await renderPagina();
    const probe = probeDe(fixture);

    expect(probe.detalheDia()).toBeNull();

    // Indice 5 e 29/05, o dia que o mockup detalha no balao.
    probe.destacarDia(5);
    const detalhe = probe.detalheDia();
    expect(detalhe?.dia).toBe('29/05');
    expect(detalhe?.valores.map((v) => v.valor)).toEqual([156, 198, 17]);

    probe.limparDia();
    expect(probe.detalheDia()).toBeNull();
  });

  it('as tres series cobrem os sete dias do periodo', async () => {
    const { fixture } = await renderPagina();
    const probe = probeDe(fixture);

    expect(probe.series()).toHaveLength(3);
    for (const serie of probe.series()) {
      expect(serie.valores).toHaveLength(7);
    }
  });

  it('os indicadores reproduzem coerentemente a base de exemplo', async () => {
    const { fixture } = await renderPagina();
    const probe = probeDe(fixture);

    expect(probe.metricas().map(({ total, hoje, valor }) => ({ total, hoje, valor }))).toEqual([
      { total: 1248, hoje: 89, valor: 1975430.2 },
      { total: 1573, hoje: 112, valor: 2431987.64 },
      { total: 37, hoje: 5, valor: 87642.31 },
    ]);
    expect(
      probe.conciliacao().map(({ percentual, valor, nota }) => ({ percentual, valor, nota })),
    ).toEqual([
      { percentual: 96.8, valor: '96,8%', nota: 'Meta: > 95%' },
      { percentual: 62, valor: '48', nota: 'R$ 21.340,80' },
      { percentual: 38, valor: '2h 18m', nota: 'Meta: < 6h' },
      { percentual: 45, valor: '27', nota: 'R$ 14.875,60' },
    ]);
    expect(probe.alertas().map(({ valor, severidade }) => ({ valor, severidade }))).toEqual([
      { valor: 1250, severidade: 'CRITICA' },
      { valor: 890, severidade: 'ALTA' },
      { valor: null, severidade: 'MEDIA' },
    ]);
    expect(probe.atividades().map((item) => item.valor)).toEqual([1250, 980, 1250, 2150]);
    expect(probe.integracoes().map(({ nome, estado, ativa }) => ({ nome, estado, ativa }))).toEqual(
      [
        { nome: 'Provider Pix', estado: 'Online', ativa: true },
        { nome: 'Webhooks', estado: '11:56:12', ativa: true },
      ],
    );
  });

  it('apresenta os paineis do mockup', async () => {
    await renderPagina();

    expect(screen.getByText('Conciliação operacional')).toBeTruthy();
    expect(screen.getByText('Volume Pix (24h)')).toBeTruthy();
    expect(screen.getByText('Alertas e divergências')).toBeTruthy();
    expect(screen.getByText('Atividade recente')).toBeTruthy();
    expect(screen.getByText('Ações rápidas')).toBeTruthy();
    expect(screen.getByText('Integrações ativas')).toBeTruthy();
  });
});
