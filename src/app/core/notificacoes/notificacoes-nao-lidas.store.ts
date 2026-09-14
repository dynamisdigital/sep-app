import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { Subscription } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { NotificacaoService } from './notificacao.service';

export type ContagemNaoLidas =
  | { situacao: 'carregando' }
  | { situacao: 'indisponivel' }
  | { situacao: 'conhecida'; naoLidas: number };

interface Registro {
  dono: string;
  contagem: ContagemNaoLidas;
}

// Contador de nao lidas compartilhado entre o header e a central (F-Sprint 27). Root porque o
// header vive o tempo todo no shell e a central e rota filha: os dois precisam do MESMO numero.
//
// Sem polling, por decisao da spec 127: atualiza ao montar o shell, ao abrir a central e depois de
// marcar leitura. Entre esses momentos pode estar desatualizado — garantia "read your writes", nao
// "read others' writes".
//
// Por ser root, destruir o header nao limpa nada. Tres guardas vinculam o estado a sessao:
// - `contagem` so expoe o registro do usuario logado agora: logout, troca de usuario e resposta
//   tardia de outra sessao somem na hora, sem depender de quando a resposta chega;
// - consulta substituida e cancelada (`unsubscribe`), entao sua resposta nunca e aplicada;
// - sessao encerrada (logout, 401, 423 — todos passam por `clearSession`) descarta registro e
//   consulta em voo, para o proximo login do mesmo usuario nao herdar o numero da sessao anterior.
@Injectable({ providedIn: 'root' })
export class NotificacoesNaoLidasStore {
  private readonly auth = inject(AuthService);
  private readonly notificacoes = inject(NotificacaoService);

  private readonly registro = signal<Registro | null>(null);
  private consultaEmVoo: { dono: string; assinatura: Subscription } | null = null;

  readonly contagem = computed<ContagemNaoLidas | null>(() => {
    const registro = this.registro();
    const dono = this.auth.currentUser()?.id;
    return registro !== null && registro.dono === dono ? registro.contagem : null;
  });

  constructor() {
    effect(() => {
      if (this.auth.currentUser() === null) {
        untracked(() => this.descartar());
      }
    });
  }

  // Idempotente enquanto houver consulta do mesmo usuario em voo: header e central pedindo na mesma
  // abertura geram uma requisicao so. Reconsulta mantem o valor conhecido ate a resposta chegar.
  carregar(): void {
    const dono = this.auth.currentUser()?.id;
    if (!dono || this.consultaEmVoo?.dono === dono) {
      return;
    }
    this.consultaEmVoo?.assinatura.unsubscribe();
    if (this.registro()?.dono !== dono) {
      this.registro.set({ dono, contagem: { situacao: 'carregando' } });
    }

    const assinatura = this.notificacoes.contarNaoLidas().subscribe({
      next: ({ naoLidas }) => {
        this.registro.set({ dono, contagem: { situacao: 'conhecida', naoLidas } });
      },
      error: () => {
        // Falha nao afirma zero; e reconsulta que falha nao apaga o numero ja conhecido.
        if (this.registro()?.contagem.situacao !== 'conhecida') {
          this.registro.set({ dono, contagem: { situacao: 'indisponivel' } });
        }
      },
    });
    assinatura.add(() => {
      if (this.consultaEmVoo?.assinatura === assinatura) {
        this.consultaEmVoo = null;
      }
    });
    if (!assinatura.closed) {
      this.consultaEmVoo = { dono, assinatura };
    }
  }

  // Leitura confirmada pelo servidor de um aviso que estava nao lido na tela ("read your writes").
  // A contagem em voo foi pedida ANTES da leitura e pode trazer o numero antigo: e cancelada. Baixa
  // local uma vez, so sobre numero conhecido e sem negativo; desconhecida segue desconhecida. A
  // reconsulta reconcilia leitura feita em outro canal, e se falhar a baixa fica.
  registrarLeitura(): void {
    const dono = this.auth.currentUser()?.id;
    if (!dono) {
      return;
    }
    this.consultaEmVoo?.assinatura.unsubscribe();
    const atual = this.registro();
    if (atual?.dono === dono && atual.contagem.situacao === 'conhecida') {
      const naoLidas = Math.max(0, atual.contagem.naoLidas - 1);
      this.registro.set({ dono, contagem: { situacao: 'conhecida', naoLidas } });
    }
    this.carregar();
  }

  private descartar(): void {
    this.consultaEmVoo?.assinatura.unsubscribe();
    this.consultaEmVoo = null;
    this.registro.set(null);
  }
}
