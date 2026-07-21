import { Injectable } from '@angular/core';

import { TipoChavePix } from '../api/api.models';

const novaIdempotencyKey = (): string =>
  globalThis.crypto?.randomUUID?.() ?? `key-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;

// Rascunho do cadastro: o que sera enviado, sem a Idempotency-Key (que nunca sai do store).
export interface RascunhoChavePix {
  tipo: TipoChavePix;
  valor: string;
}

// Uma intencao de cadastro = um tipo + um valor confirmado + uma Idempotency-Key. Vive SOMENTE em
// memoria (nunca em localStorage/sessionStorage) e num singleton de root para sobreviver a
// navegacao SPA de ida e volta ao step-up — a pagina e destruida nessa navegacao e, sem o store,
// um retry legitimo apos rede/5xx nasceria com key nova, podendo duplicar uma chave que o backend
// cadastrou mas cuja resposta se perdeu. Reload de pagina perde a intencao por definicao.
//
// O valor em claro fica aqui apenas enquanto a intencao vive: e o que permite reconstituir o
// rascunho no retorno do step-up e garantir que o retry use a MESMA key. Nunca e persistido nem
// exibido fora do formulario/dialogo que o usuario acabou de preencher.
@Injectable({ providedIn: 'root' })
export class ChavePixIntencaoStore {
  private intencao: { tipo: TipoChavePix; valor: string; key: string } | null = null;

  // Devolve a key da intencao corrente quando tipo E valor coincidem (retry legitimo); qualquer
  // divergencia cria uma intencao nova com key nova, substituindo a anterior.
  chave(tipo: TipoChavePix, valor: string): string {
    if (this.intencao && this.intencao.tipo === tipo && this.intencao.valor === valor) {
      return this.intencao.key;
    }
    this.intencao = { tipo, valor, key: novaIdempotencyKey() };
    return this.intencao.key;
  }

  // Rascunho preservado para reconstituir o formulario ao voltar do step-up. Sem ele, o operador
  // reencontraria o formulario vazio e um simples erro de digitacao no reenvio geraria key nova —
  // exatamente a duplicacao que a intencao existe para evitar. A key nunca e exposta.
  rascunho(): RascunhoChavePix | null {
    return this.intencao ? { tipo: this.intencao.tipo, valor: this.intencao.valor } : null;
  }

  // Encerra a intencao: sucesso (201/200) ou erro terminal (400/409/422) — nada a repetir com a
  // mesma key. Rede/5xx e 403 de step-up NAO limpam: sao os casos em que o replay idempotente com
  // a mesma key protege contra duplicacao.
  limpar(): void {
    this.intencao = null;
  }
}
