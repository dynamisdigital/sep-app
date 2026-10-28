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
  // Avanca a cada contagem recebida do servidor. Uma leitura enviada ANTES de um marco pode ja estar
  // contada nele; por isso cada envio guarda o marco vigente no seu primeiro envio.
  private marcoDaContagem = 0;
  private readonly marcoPorLeituraEnviada = new Map<string, number>();

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
        this.marcoDaContagem += 1;
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

  // Chamado antes de cada POST de leitura. O retry do mesmo aviso mantem o marco do PRIMEIRO envio:
  // a tentativa que caiu por timeout pode ter gravado, e uma contagem posterior ja a reflete.
  leituraEnviada(id: string): void {
    if (!this.marcoPorLeituraEnviada.has(id)) {
      this.marcoPorLeituraEnviada.set(id, this.marcoDaContagem);
    }
  }

  // Leitura confirmada pelo servidor de um aviso que estava nao lido na tela ("read your writes").
  // A contagem em voo foi pedida ANTES da confirmacao e pode trazer o numero antigo: e cancelada.
  // Baixa local uma vez, sem negativo, e SO quando nenhuma contagem chegou depois do envio: ai o numero
  // conhecido e anterior a leitura e nao a inclui. Se chegou, ela pode ja ter descontado esta leitura
  // (outra leitura concorrente, ou retry depois de timeout que gravou) e descontar de novo esconderia
  // aviso nao lido; entao so a reconsulta decide. Na duvida o contador fica alto por um instante,
  // nunca baixo. Desconhecida segue desconhecida; se a reconsulta falhar, fica o que havia.
  registrarLeitura(id: string): void {
    const dono = this.auth.currentUser()?.id;
    if (!dono) {
      return;
    }
    const baseAnteriorAoEnvio = this.marcoPorLeituraEnviada.get(id) === this.marcoDaContagem;
    // Higiene do Map, nao guarda: aviso confirmado nao volta a ser enviado.
    this.marcoPorLeituraEnviada.delete(id);
    this.consultaEmVoo?.assinatura.unsubscribe();
    const atual = this.registro();
    if (baseAnteriorAoEnvio && atual?.dono === dono && atual.contagem.situacao === 'conhecida') {
      const naoLidas = Math.max(0, atual.contagem.naoLidas - 1);
      this.registro.set({ dono, contagem: { situacao: 'conhecida', naoLidas } });
    }
    this.carregar();
  }

  private descartar(): void {
    this.consultaEmVoo?.assinatura.unsubscribe();
    this.consultaEmVoo = null;
    // Higiene de memoria entre sessoes: uma entrada velha nunca casa com o marco de uma contagem nova.
    this.marcoPorLeituraEnviada.clear();
    this.registro.set(null);
  }
}
