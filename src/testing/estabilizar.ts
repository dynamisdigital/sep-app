import { ComponentFixture } from '@angular/core/testing';

/**
 * Helpers de estabilizacao usados pelos specs de componente. Antes da F-24.6 cada spec definia os
 * dois localmente: **38 copias de `estabilizar` e 42 de `flush`**, em ~44 arquivos.
 *
 * As copias de `estabilizar` tinham assinatura identica mas **tres corpos distintos**, e a
 * identidade textual escondia um split semantico: o corpo "padrao" chamava um `flush` local cujo
 * default variava entre `5` (31 arquivos) e `6` (11), entao o mesmo texto drenava quantidades
 * diferentes conforme o arquivo. Um spec inlinava o laco de 5 iteracoes e outro nao drenava nada.
 *
 * **A drenagem fica, e o default e `5`.** O Gate F-24.0 mediu que ela e dispensavel — a suite passa
 * 765/93 com `await flush()` removido dos 36 arquivos, e a mutacao de controle
 * (`chaves-pix-page.component.ts:145`, `this.chaves.set([])`) derrubou 20 testes mesmo sem drenagem,
 * provando que os specs nao passavam por causa dela. Ainda assim manter custa quatro linhas e
 * remover apertaria o timing de 37 arquivos: teste sensivel a carga fica flaky sob CPU saturada sem
 * aparecer numa rodada limpa. Com `5`, nenhum arquivo passa a ter MENOS tempo de settle do que tinha
 * antes — os 11 que usavam `6` foram medidos verdes com `5` (142 testes).
 *
 * NAO "otimizar" removendo a drenagem sem repetir aquela medicao, incluindo o controle de vacuo.
 */
export async function flush(times = 5): Promise<void> {
  for (let i = 0; i < times; i += 1) {
    await Promise.resolve();
  }
}

/** Deixa a resposta pendente chegar ao signal e o template repintar. */
export async function estabilizar(fixture: ComponentFixture<unknown>): Promise<void> {
  await fixture.whenStable();
  await flush();
  fixture.detectChanges();
}
