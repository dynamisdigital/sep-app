import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PoliticaLockoutResponse } from '../api/api.models';

const API_BASE_URL = environment.apiBaseUrl;

/**
 * `GET /auth/politica-lockout` (backend Sprint 34): publico, GET-only, sem parametros. Devolve os
 * tres numeros EFETIVOS do ambiente, e nao os defaults fixos no codigo.
 *
 * Servico proprio em vez de metodo no `AuthService` porque este endpoint existe justamente para a
 * tela que NAO tem sessao: acoplar os dois faria a pagina do 423 depender do objeto que o 423
 * acabou de invalidar.
 *
 * Falha em silencio de proposito, no padrao de `AuthService` (`catchError` -> `of(null)`). O unico
 * consumidor e `/account-locked`, destino de redirect global e alcancavel por URL direta: ela
 * renderiza sem nunca ter recebido resposta de API e nao pode depender desta chamada. Devolver
 * `PoliticaLockoutResponse | null` poe esse contrato no TIPO, em vez de num comentario que o
 * proximo consumidor pode nao ler.
 *
 * O `catchError` mora aqui e NAO deve ser movido para o componente "para o servico ficar puro":
 * `toSignal` relanca o erro na leitura do signal, entao sem ele qualquer falha de rede derruba o
 * render da pagina inteira — exatamente a pagina que precisa sobreviver a tudo.
 *
 * O `map` que descarta corpo incompleto nao e paranoia: o springdoc nao emite `required` no
 * `PoliticaLockoutResponseDto`, entao o contrato nao garante os campos. Sem ele, um corpo `{}`
 * renderiza "por ate undefined minutos" na cara do usuario.
 */
@Injectable({ providedIn: 'root' })
export class PoliticaLockoutService {
  private readonly http = inject(HttpClient);

  consultar(): Observable<PoliticaLockoutResponse | null> {
    return this.http.get<PoliticaLockoutResponse>(`${API_BASE_URL}/auth/politica-lockout`).pipe(
      map((politica) => (ehUtilizavel(politica) ? politica : null)),
      catchError(() => of(null)),
    );
  }
}

/** Os tres campos precisam existir como inteiros positivos; zero ou negativo nao descreve politica. */
function ehUtilizavel(politica: PoliticaLockoutResponse | null): boolean {
  return (
    !!politica &&
    [politica.maxAttempts, politica.windowMinutes, politica.lockoutMinutes].every(
      (valor) => Number.isInteger(valor) && valor > 0,
    )
  );
}
