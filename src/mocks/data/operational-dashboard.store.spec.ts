import { describe, expect, it } from 'vitest';

import {
  buildOperationalDashboardSnapshot,
  createOperationalDashboardStore,
} from './operational-dashboard.store';

describe('operational dashboard fake store', () => {
  it('deriva os valores exibidos no mockup 03 de uma unica base', () => {
    const snapshot = buildOperationalDashboardSnapshot(createOperationalDashboardStore());

    expect(snapshot.indicadores.find((item) => item.dominio === 'ONBOARDING')?.valor).toBe(12);
    expect(snapshot.jornadas.find((item) => item.dominio === 'ONBOARDING')?.pendencias).toBe(12);
    expect(snapshot.indicadores.find((item) => item.dominio === 'CREDITO')?.valor).toBe(8);
    expect(snapshot.resumo.find((item) => item.id === 'PAGAMENTOS_PIX')?.valor).toBe(24);
    expect(snapshot.volume.valor).toBe(2_480_000);
  });

  it('sincroniza indicador, jornada e resumo quando a base muda', () => {
    const store = createOperationalDashboardStore();
    store.onboardings.push({
      id: 'onb-novo',
      criadoEm: '2026-07-17T12:01:00-03:00',
      status: 'EM_ANDAMENTO',
    });

    const snapshot = buildOperationalDashboardSnapshot(store);

    expect(snapshot.indicadores.find((item) => item.dominio === 'ONBOARDING')?.valor).toBe(13);
    expect(snapshot.jornadas.find((item) => item.dominio === 'ONBOARDING')?.pendencias).toBe(13);
    expect(snapshot.resumo.find((item) => item.id === 'NOVOS_CADASTROS')?.valor).toBe(8);
  });

  it('calcula progresso e variacoes sem valores duplicados no snapshot', () => {
    const snapshot = buildOperationalDashboardSnapshot(createOperationalDashboardStore());
    const formalizacao = snapshot.jornadas.find((item) => item.dominio === 'FORMALIZACAO');
    const onboarding = snapshot.indicadores.find((item) => item.dominio === 'ONBOARDING');

    expect(formalizacao).toMatchObject({ pendencias: 5, total: 8 });
    expect(onboarding?.variacaoPercentual).toBe(20);
    expect(snapshot.atividades).toHaveLength(5);
    expect(snapshot.saudeServicos.every((item) => item.status === 'ONLINE')).toBe(true);
  });
});
