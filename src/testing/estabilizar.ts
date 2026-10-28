/**
 * @fileoverview
 * Helpers de estabilizacao usados pelos specs de componente. Antes da F-24.6 cada spec definia os
 * dois localmente: **38 copias de `estabilizar` e 42 de `flush`**, em ~44 arquivos.
 *
 * As copias de `estabilizar` tinham assinatura identica mas **tres corpos distintos**, e a
 * identidade textual escondia um split semantico: o corpo "padrao" chamava um `flush` local cujo
 * default variava entre `5` e `6`, entao o mesmo texto drenava quantidades diferentes conforme o
 * arquivo. Um spec inlinava o laco de 5 iteracoes e outro nao drenava nada. (Denominadores: **31**
 * definicoes de `flush(5)` e 11 de `flush(6)` = 42; dessas, **25** + 11 convivem com um
 * `estabilizar`, e as outras 6 estao em arquivos que so definem `flush`.)
 *
 * **A drenagem fica, e o default e `5`** — mas o efeito exato, sem arredondar: 25 arquivos ficam
 * identicos, `account-locked` vai de 5 inline para 5 compartilhado, `aportes-list` de 0 para 5, e
 * **11 arquivos vao de 6 para 5**, ou seja, uma drenagem A MENOS. Esses 11 foram medidos verdes com
 * `5` (142 testes) e tambem com `times = 0`: a drenagem nao e o que os sustenta, entao a margem e o
 * laco inteiro, e nao um tick.
 *
 * O Gate F-24.0 ja havia medido o mesmo na suite toda — 765/93 verdes (o total integral **naquele
 * momento**; hoje a suite e maior) com `await flush()` removido dos 36 arquivos —, e a mutacao de
 * controle (`chaves-pix-page.component.ts:145`, `this.chaves.set([])`) derrubou 20 testes mesmo sem
 * drenagem, provando que os specs nao passavam por causa dela.
 *
 * Entao por que manter? Porque custa quatro linhas e o objetivo desta extracao era equivalencia, nao
 * otimizacao. **Nao e protecao contra carga**: `await Promise.resolve()` so avanca cadeias JA
 * resolvidas dentro de um mesmo checkpoint de microtasks, e nao espera macrotask nenhuma — quem
 * absorve variacao de maquina aqui e o `fixture.whenStable()` da primeira linha de `estabilizar`. Se
 * 5 basta numa maquina ociosa, basta numa saturada; e se 6 fosse necessario, 5 falharia de forma
 * deterministica, nao flaky.
 *
 * NAO "otimizar" removendo a drenagem sem repetir aquela medicao, incluindo o controle de vacuo.
 */
import { ComponentFixture } from '@angular/core/testing';

/** Drena `times` rodadas de microtasks ja resolvidas. Ver o @fileoverview acima. */
export async function flush(times = 5): Promise<void> {
  for (let i = 0; i < times; i += 1) {
    await Promise.resolve();
  }
}

/**
 * Deixa a resposta pendente chegar ao signal e o template repintar. E o `whenStable()` daqui — nao o
 * `flush()` — que absorve variacao de maquina. Ver o @fileoverview acima.
 */
export async function estabilizar(fixture: ComponentFixture<unknown>): Promise<void> {
  await fixture.whenStable();
  await flush();
  fixture.detectChanges();
}
