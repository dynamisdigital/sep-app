import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { beforeEach, describe, expect, it } from 'vitest';

import { UsuarioResponse, UsuarioRole } from '../api/api.models';
import { AuthService } from '../auth/auth.service';
import { NotificacoesService } from './notificacoes.service';

function usuario(role: UsuarioRole, extra: Partial<UsuarioResponse> = {}): UsuarioResponse {
  return {
    id: `id-${role}`,
    username: `${role.toLowerCase()}@empresa.com`,
    role,
    dataCriacao: '2026-04-24T18:30:00-03:00',
    dataModificacao: '2026-04-24T18:30:00-03:00',
    criadoPor: 'system',
    modificadoPor: 'system',
    precisaRedefinirSenha: false,
    mfaHabilitado: true,
    ...extra,
  };
}

function montar(user: UsuarioResponse | null): NotificacoesService {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      { provide: AuthService, useValue: { currentUser: signal(user).asReadonly() } },
    ],
  });
  return TestBed.inject(NotificacoesService);
}

async function esperar(ms = 60): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

describe('NotificacoesService', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    window.localStorage.clear();
  });

  // Os avisos da própria conta saem do DTO já carregado: não custam requisição e valem para
  // qualquer papel.
  it('avisa sobre senha a redefinir e segunda etapa desligada', () => {
    const servico = montar(
      usuario('CLIENTE', { precisaRedefinirSenha: true, mfaHabilitado: false }),
    );

    const ids = servico.alertas().map((a) => a.id);
    expect(ids).toEqual(['senha', 'mfa']);
    expect(servico.total()).toBe(2);
  });

  it('conta zero quando a conta está em ordem e o papel não é de operação', () => {
    const servico = montar(usuario('CLIENTE'));
    expect(servico.total()).toBe(0);
  });

  // O endpoint do painel é de operação e responderia 403 para a credora: a chamada nem sai.
  it('nao consulta o painel para CLIENTE', async () => {
    const servico = montar(usuario('CLIENTE'));
    servico.carregar();
    await esperar();

    expect(servico.carregando()).toBe(false);
    expect(servico.alertas().length).toBe(0);
  });

  it('deriva os alertas de operacao do painel de backoffice', async () => {
    const servico = montar(usuario('ADMIN'));
    servico.carregar();
    await esperar(200);

    const alertas = servico.alertas();
    const ids = alertas.map((a) => a.id);

    expect(ids).toContain('criticos');
    expect(ids).toContain('fila');
    expect(ids).toContain('inadimplencia');
    expect(ids).toContain('propostas');
    // Todo alerta declara de onde saiu o número e para onde leva.
    expect(alertas.every((a) => a.origem.length > 0)).toBe(true);
    expect(alertas.every((a) => a.rota !== undefined)).toBe(true);
  });

  // O número tem de fechar com a carteira canônica: 5 parcelas, R$ 2.012,50.
  it('o alerta de inadimplencia traz o total da carteira', async () => {
    const servico = montar(usuario('FINANCEIRO'));
    servico.carregar();
    await esperar(200);

    const alerta = servico.alertas().find((a) => a.id === 'inadimplencia');
    expect(alerta?.titulo).toContain('5 parcela');
    expect(alerta?.detalhe.replace(/\u00a0/g, ' ')).toContain('R$ 2.012,50');
  });

  // BACKOFFICE não opera cobrança financeira, então o alerta de inadimplência não é dele.
  it('inadimplencia so aparece para financeiro e admin', async () => {
    const servico = montar(usuario('BACKOFFICE'));
    servico.carregar();
    await esperar(200);

    const ids = servico.alertas().map((a) => a.id);
    expect(ids).toContain('fila');
    expect(ids).not.toContain('inadimplencia');
  });
});
