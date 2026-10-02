import { Injectable, computed, inject, signal } from '@angular/core';

import { DashboardResponse, UsuarioRole } from '../api/api.models';
import { AuthService } from '../auth/auth.service';
import { BackofficeService } from '../backoffice/backoffice.service';
import { formatarMoeda } from '../format/br-format';

export type TomAlerta = 'red' | 'amber' | 'blue' | 'green';

export interface Alerta {
  id: string;
  titulo: string;
  detalhe: string;
  tom: TomAlerta;
  icone: string;
  /** Tela que resolve o alerta. Sem rota, o alerta é apenas informativo. */
  rota?: string;
  /** De onde o número saiu, para o operador poder conferir. */
  origem: string;
}

const OPERADORES: UsuarioRole[] = ['BACKOFFICE', 'FINANCEIRO', 'ADMIN'];
const FINANCEIRO: UsuarioRole[] = ['FINANCEIRO', 'ADMIN'];

/**
 * Alertas do sino do cabeçalho. Não existe endpoint de notificações no backend, e inventar uma
 * lista fixa seria pior do que não ter sino nenhum: o operador aprende a ignorar um contador que
 * nunca muda. Então os alertas são **derivados do estado real** — o painel de backoffice dá os
 * contadores da fila, da inadimplência e das propostas em análise numa única chamada, e o DTO do
 * usuário dá os avisos de segurança da própria conta.
 *
 * Cada alerta declara a origem do número e aponta para a tela que o resolve.
 */
@Injectable({ providedIn: 'root' })
export class NotificacoesService {
  private readonly auth = inject(AuthService);
  private readonly backoffice = inject(BackofficeService);

  private readonly painel = signal<DashboardResponse | null>(null);
  private readonly carregado = signal(false);

  readonly carregando = signal(false);
  /** O painel não respondeu: os alertas operacionais ficam de fora, e a tela diz por quê. */
  readonly erro = signal<string | null>(null);

  private readonly papel = computed(() => this.auth.currentUser()?.role ?? null);

  /** Avisos da própria conta. Saem do DTO do usuário, já carregado — não custam requisição. */
  private readonly pessoais = computed<Alerta[]>(() => {
    const user = this.auth.currentUser();
    if (!user) return [];
    const lista: Alerta[] = [];
    if (user.precisaRedefinirSenha) {
      lista.push({
        id: 'senha',
        titulo: 'Redefina sua senha',
        detalhe: 'A conta está marcada para troca de senha no próximo acesso.',
        tom: 'red',
        icone: 'key-round',
        rota: '/app/profile/change-password',
        origem: 'campo precisaRedefinirSenha do seu usuário',
      });
    }
    if (!user.mfaHabilitado) {
      lista.push({
        id: 'mfa',
        titulo: 'Segunda etapa desativada',
        detalhe: 'Sem TOTP, operações que exigem confirmação adicional ficam bloqueadas.',
        tom: 'amber',
        icone: 'shield',
        rota: '/app/profile/setup-totp',
        origem: 'campo mfaHabilitado do seu usuário',
      });
    }
    return lista;
  });

  /** Alertas de operação, derivados do painel de backoffice. */
  private readonly operacionais = computed<Alerta[]>(() => {
    const dados = this.painel();
    const papel = this.papel();
    if (!dados || !papel || !OPERADORES.includes(papel)) return [];

    const porTipo = (tipo: string) =>
      dados.contadoresPorTipo.find((c) => c.tipo === tipo)?.total ?? 0;
    const abertos = dados.contadoresPorStatus.find((c) => c.status === 'ABERTO')?.total ?? 0;
    const emAnalise = dados.propostasPorStatus.find((p) => p.status === 'EM_ANALISE')?.total ?? 0;
    const webhooks = porTipo('WEBHOOK_FALHOU');
    const desembolsos = porTipo('DESEMBOLSO_PIX_FALHOU');
    const divergencias = porTipo('RECEBIMENTO_PIX_DIVERGENTE');
    const inadimplencia = dados.inadimplenciaTotal;

    const lista: Alerta[] = [];

    if (dados.itensCriticosAbertosMais48h > 0) {
      lista.push({
        id: 'criticos',
        titulo: `${dados.itensCriticosAbertosMais48h} item(ns) crítico(s) há mais de 48h`,
        detalhe: 'Itens críticos abertos além do limite operacional.',
        tom: 'red',
        icone: 'triangle-alert',
        rota: '/app/backoffice/fila',
        origem: 'painel de backoffice · itensCriticosAbertosMais48h',
      });
    }

    if (abertos > 0) {
      lista.push({
        id: 'fila',
        titulo: `${abertos} item(ns) aberto(s) na fila`,
        detalhe: 'Pendências aguardando atribuição ou tratamento.',
        tom: 'amber',
        icone: 'inbox',
        rota: '/app/backoffice/fila',
        origem: 'painel de backoffice · contadores por status',
      });
    }

    if (webhooks > 0) {
      lista.push({
        id: 'webhooks',
        titulo: `${webhooks} webhook(s) com falha`,
        detalhe: 'Eventos que não foram processados e podem ser reenviados.',
        tom: 'amber',
        icone: 'webhook',
        rota: '/app/backoffice/reprocessos/webhook',
        origem: 'painel de backoffice · contadores por tipo',
      });
    }

    if (desembolsos > 0) {
      lista.push({
        id: 'desembolsos',
        titulo: `${desembolsos} desembolso(s) Pix com falha`,
        detalhe: 'Transferências que não se concluíram e precisam de reconsulta.',
        tom: 'red',
        icone: 'send',
        rota: '/app/pix/desembolsos',
        origem: 'painel de backoffice · contadores por tipo',
      });
    }

    if (divergencias > 0) {
      lista.push({
        id: 'divergencias',
        titulo: `${divergencias} recebimento(s) Pix divergente(s)`,
        detalhe: 'Valores recebidos que não fecham com a referência gerada.',
        tom: 'amber',
        icone: 'circle-alert',
        rota: '/app/pix/divergencias',
        origem: 'painel de backoffice · contadores por tipo',
      });
    }

    if (FINANCEIRO.includes(papel) && inadimplencia.numeroParcelas > 0) {
      lista.push({
        id: 'inadimplencia',
        titulo: `${inadimplencia.numeroParcelas} parcela(s) em atraso`,
        detalhe: `${formatarMoeda(inadimplencia.valorTotal)} em aberto na régua de cobrança.`,
        tom: 'red',
        icone: 'banknote',
        rota: '/app/cobranca/financeiro/inadimplencia',
        origem: 'painel de backoffice · inadimplenciaTotal',
      });
    }

    if (emAnalise > 0) {
      lista.push({
        id: 'propostas',
        titulo: `${emAnalise} proposta(s) em análise`,
        detalhe: 'Propostas na esteira aguardando decisão.',
        tom: 'blue',
        icone: 'credit-card',
        rota: '/app/credito/propostas',
        origem: 'painel de backoffice · propostas por status',
      });
    }

    return lista;
  });

  readonly alertas = computed<Alerta[]>(() => [...this.pessoais(), ...this.operacionais()]);
  readonly total = computed(() => this.alertas().length);

  /**
   * Busca o painel uma vez por sessão, e só para quem o alcança. Para CLIENTE a chamada nem sai:
   * o endpoint é de operação e responderia 403.
   */
  carregar(): void {
    const papel = this.papel();
    if (this.carregado() || this.carregando() || !papel || !OPERADORES.includes(papel)) {
      return;
    }
    this.carregando.set(true);
    this.backoffice.consultarDashboard().subscribe({
      next: (dados) => {
        this.painel.set(dados);
        this.carregado.set(true);
        this.carregando.set(false);
      },
      error: () => {
        this.carregando.set(false);
        this.carregado.set(true);
        this.erro.set('Não foi possível carregar os alertas de operação.');
      },
    });
  }

  /** Nova consulta ao painel, para o operador conferir depois de tratar uma pendência. */
  atualizar(): void {
    this.carregado.set(false);
    this.erro.set(null);
    this.carregar();
  }
}
