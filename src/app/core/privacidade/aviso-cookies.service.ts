import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

const AVISO_KEY = 'SEP_AVISO_COOKIES';

/**
 * Versao do texto do aviso. **Subir isto reexibe o aviso para quem ja o dispensou.**
 *
 * Nao e versionamento especulativo: o texto entra pendente de revisao juridica, entao a reescrita e
 * evento certo, nao hipotese. Guardar a versao em vez de um booleano custa a mesma linha e evita que
 * um texto novo seja considerado visto por quem so leu o antigo.
 */
const VERSAO_AVISO = '1';

/**
 * Estado do aviso de cookies (F-Sprint 25).
 *
 * Molde do `ThemeService`: preferencia local, signal readonly, sem rede. **O aceite nunca vai ao
 * servidor** — persisti-lo criaria tratamento de dado pessoal que hoje nao existe, para resolver um
 * problema que nao existe. E preferencia de exibicao, nao consentimento colhido: o unico cookie do
 * produto e necessario a autenticacao e nao seria recusavel de qualquer forma.
 *
 * **Divergencia deliberada em relacao ao `ThemeService`**: la o acesso ao storage usa apenas optional
 * chaining (`theme.service.ts:55`, `:60`), o que cobre a ausencia de `window` mas **nao** cobre
 * `getItem`/`setItem` lancando — quota estourada, modo privado, storage desabilitado por politica.
 * Esse modo de falha nao e teorico neste repo: `login.component.ts:31`,
 * `verify-totp.component.ts:146` e `copy-de-erro.ts:14` existem porque ele aconteceu ao persistir o
 * token.
 *
 * Por isso leitura e escrita sao envolvidas, e a falha e **fail-open para exibir**: storage quebrado
 * significa aviso visivel de novo, nunca aplicacao quebrada e nunca aviso suprimido por acidente.
 * Suprimir por falha seria a direcao perigosa da assimetria — o usuario deixaria de ser informado
 * justamente porque algo deu errado.
 */
@Injectable({ providedIn: 'root' })
export class AvisoCookiesService {
  private readonly document = inject(DOCUMENT);
  private readonly visivel = signal<boolean>(!this.jaFoiVisto());

  readonly avisoVisivel = this.visivel.asReadonly();

  marcarComoVisto(): void {
    // O estado em memoria muda primeiro e independe do storage: mesmo que a persistencia falhe, o
    // aviso some nesta sessao. Persistir e o que evita reexibir na proxima; falhar nisso reexibe,
    // que e o lado seguro.
    this.visivel.set(false);
    this.persistir();
  }

  private jaFoiVisto(): boolean {
    return this.ler() === VERSAO_AVISO;
  }

  private ler(): string | null {
    try {
      return this.document.defaultView?.localStorage.getItem(AVISO_KEY) ?? null;
    } catch {
      return null;
    }
  }

  private persistir(): void {
    try {
      this.document.defaultView?.localStorage.setItem(AVISO_KEY, VERSAO_AVISO);
    } catch {
      // Sem acao: o aviso volta na proxima visita. Ver o fail-open no doc da classe.
    }
  }
}
