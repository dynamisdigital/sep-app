import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import { PoliticaLockoutResponse } from '../../../core/api/api.models';
import { PoliticaLockoutService } from '../../../core/auth/politica-lockout.service';

/** Fallback: alcancavel so com o endpoint fora do ar — estado em que o login tambem nao funciona. */
const EXPLICACAO_SEM_POLITICA =
  'Detectamos varias tentativas de acesso malsucedidas — senha ou codigo de verificacao. Por ' +
  'seguranca, sua conta fica bloqueada por ate 30 minutos, contados a partir da ultima tentativa.';

function minutos(valor: number): string {
  return `${valor} ${valor === 1 ? 'minuto' : 'minutos'}`;
}

function explicacaoComPolitica(politica: PoliticaLockoutResponse): string {
  return (
    `Detectamos ${politica.maxAttempts} ou mais tentativas de acesso malsucedidas em ` +
    `${minutos(politica.windowMinutes)} — senha ou codigo de verificacao. Por seguranca, sua conta ` +
    `fica bloqueada por ate ${minutos(politica.lockoutMinutes)}, contados a partir da ultima tentativa.`
  );
}

/**
 * Destino do redirect global de 423 (`errorInterceptor`), tambem alcancavel por URL direta.
 *
 * A copy da politica deixou de ser estatica na F-Sprint 23: os tres numeros vem de
 * `GET /auth/politica-lockout`, que anuncia a configuracao EFETIVA do ambiente. O que e contrato
 * agora e o MOLDE da frase, nao a string — por isso a spec trava as duas variantes com valores de
 * fixture distintos dos defaults.
 *
 * A pagina nao pode depender dessa chamada: ela renderiza depois do redirect e tambem por URL
 * direta, sem nunca ter recebido resposta de API. Dai o `initialValue: null` e o fallback estatico —
 * a tela nasce completa e a politica so refina o texto. NUNCA colocar o `<h1>` (nem o card) dentro
 * de um bloco `@if` guiado por este signal: a chegada da politica passaria a destruir e recriar
 * nos, e o foco movido em `ngAfterViewInit` — que existe porque esta e uma pagina de desfecho de
 * evento de seguranca — seria perdido.
 *
 * O `Retry-After` NAO serve aqui: o `errorInterceptor` navega e descarta o `HttpErrorResponse`, e
 * por URL direta nao ha resposta nenhuma. Por isso as duas telas usam preposicoes diferentes de
 * proposito: aqui, "bloqueada por ate X minutos" (duracao nominal da politica); no login, "tente
 * novamente em Y minutos" (restante real do header). Numeros diferentes na mesma incidencia estao
 * corretos.
 *
 * Cada afirmacao da copy foi conferida contra o sep-api:
 * - "N ou mais tentativas em M minutos": `LockoutService` bloqueia quando as `maxAttempts` falhas
 *   mais recentes cabem na janela, e `verificar()` roda ANTES do registro — entao o 423 so aparece
 *   na requisicao seguinte, e quem chega aqui pode ter mais que `maxAttempts`. "Foram 5 tentativas"
 *   seria mentira nesse caso; "5 ou mais" nao e.
 * - "contados a partir da ultima tentativa": `PoliticaLockout.eventoDeBloqueio` mede o prazo a
 *   partir da falha que fecha a janela, nao de quando esta tela abre. Como nenhuma falha e gravada
 *   durante o bloqueio, o prazo nunca se estende — mas quem chega aqui depois tem menos tempo
 *   restante, e por isso "por ate".
 * - "senha ou codigo de verificacao": `LockoutService.STATUSES_FALHA` conta SENHA_INVALIDA e
 *   TOTP_INVALIDO, e `VerificarTotpUseCase` lanca o mesmo 423 — quem errou o TOTP tambem cai aqui.
 * - "nao existe liberacao manual": conferido que nao ha endpoint de unlock, acao de backoffice,
 *   job ou delete em `LoginAttemptRepository`. A unica saida e a expiracao. A frase descreve o
 *   sistema sem mandar o usuario desistir de pedir ajuda — nao ha fluxo de recuperacao de senha
 *   para quem nao esta autenticado.
 * - a orientacao de seguranca nao cita "revisar dispositivos": nao existe tela de sessoes, e
 *   `AuthService.logoutAll()` nao tem nenhum chamador.
 *
 * Expor `maxAttempts` e `windowMinutes` e decisao registrada (SEGURANCA.md §5): os tres numeros ja
 * sao publicos pelo proprio endpoint e pelo /v3/api-docs, e a janela e o que faltava para o usuario
 * entender por que esta bloqueado — quem errou 3 vezes ontem e 2 hoje nao tinha como saber.
 */
@Component({
  selector: 'sep-account-locked',
  imports: [RouterLink],
  template: `
    <main class="sep-account-locked">
      <section class="sep-account-locked-card" aria-labelledby="account-locked-title">
        <span class="sep-account-locked-badge" aria-hidden="true">423</span>
        <h1 #titulo id="account-locked-title" tabindex="-1">Conta bloqueada temporariamente</h1>
        <p>{{ explicacaoDoBloqueio() }}</p>
        <p>
          O desbloqueio e automatico e acontece so por expiracao desse prazo: nao existe liberacao
          manual. Depois disso, basta entrar de novo.
        </p>
        <p>
          Se voce nao reconhece essas tentativas, troque sua senha assim que o acesso for
          restabelecido.
        </p>
        <a routerLink="/login" class="sep-account-locked-link">Voltar ao login</a>
      </section>
    </main>
  `,
  styles: [
    `
      :host {
        display: block;
        background: hsl(var(--background));
      }
      .sep-account-locked {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        padding: var(--sep-space-32);
      }
      .sep-account-locked-card {
        max-width: 480px;
        background: hsl(var(--card));
        border: 1px solid hsl(var(--border));
        border-radius: var(--sep-radius-lg);
        padding: var(--sep-space-32);
        box-shadow: var(--shadow-md);
        display: flex;
        flex-direction: column;
        gap: var(--sep-space-17);
        text-align: center;
      }
      .sep-account-locked-badge {
        align-self: center;
        background: hsl(var(--destructive) / 12%);
        color: hsl(var(--destructive));
        padding: 4px 12px;
        border-radius: var(--sep-radius-pill);
        font-size: 13px;
        font-weight: 600;
      }
      h1 {
        margin: 0;
        color: hsl(var(--foreground));
      }
      p {
        margin: 0;
        color: hsl(var(--muted-foreground));
      }
      .sep-account-locked-link {
        color: hsl(var(--primary));
        text-decoration: none;
        font-weight: 600;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountLockedComponent implements AfterViewInit {
  private readonly titulo = viewChild.required<ElementRef<HTMLHeadingElement>>('titulo');

  // Assina na construcao, antes do primeiro paint. `consultar()` nunca erra (o `catchError` mora no
  // servico), o que importa aqui porque `toSignal` relancaria o erro na leitura do signal.
  private readonly politica = toSignal(inject(PoliticaLockoutService).consultar(), {
    initialValue: null,
  });

  protected readonly explicacaoDoBloqueio = computed(() => {
    const politica = this.politica();
    return politica ? explicacaoComPolitica(politica) : EXPLICACAO_SEM_POLITICA;
  });

  ngAfterViewInit(): void {
    // Esta pagina e destino de redirect automatico do errorInterceptor. O Angular nao move foco na
    // navegacao e o app nao tem live region de rota, entao sem isto o foco cai em <body> e o
    // usuario de leitor de tela fica em silencio numa tela nova, sem saber que a conta foi
    // bloqueada — justo no desfecho de um evento de seguranca.
    this.titulo().nativeElement.focus();
  }
}
