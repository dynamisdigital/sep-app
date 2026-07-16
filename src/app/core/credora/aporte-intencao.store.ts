import { Injectable } from '@angular/core';

const novaIdempotencyKey = (): string =>
  globalThis.crypto?.randomUUID?.() ?? `key-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;

// Uma intencao de aporte = uma operacao + um valor confirmado + uma Idempotency-Key. Vive SOMENTE
// em memoria (nunca em localStorage/sessionStorage) e num singleton de root para sobreviver a
// navegacao SPA de ida e volta ao step-up — o componente da pagina e destruido nessa navegacao e,
// sem o store, um retry legitimo apos rede/5xx nasceria com key nova, podendo duplicar um aporte
// que o backend processou mas cuja resposta se perdeu. Reload de pagina perde a intencao por
// definicao (comportamento especificado da F-18).
@Injectable({ providedIn: 'root' })
export class AporteIntencaoStore {
  private intencao: { operacaoId: string; valor: number; key: string } | null = null;

  // Devolve a key da intencao corrente quando operacao E valor coincidem (retry legitimo);
  // qualquer divergencia cria uma intencao nova com key nova, substituindo a anterior.
  chave(operacaoId: string, valor: number): string {
    if (this.intencao && this.intencao.operacaoId === operacaoId && this.intencao.valor === valor) {
      return this.intencao.key;
    }
    this.intencao = { operacaoId, valor, key: novaIdempotencyKey() };
    return this.intencao.key;
  }

  // Encerra a intencao: sucesso (201/200) ou erro terminal (400/404/409) — nada a repetir com a
  // mesma key. Rede/5xx e 403 de step-up NAO limpam: sao os casos em que o replay idempotente
  // com a mesma key protege contra duplicacao.
  limpar(): void {
    this.intencao = null;
  }
}
