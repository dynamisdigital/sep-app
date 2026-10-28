import { environment } from '../../../environments/environment';

/**
 * Indica se o app roda em ambiente de demonstracao (mocks MSW, troca de usuario ficticio, tour
 * com cliques que gravam dado). Em producao e sempre false: nem o override por localStorage liga o
 * mock. (SEC-02)
 *
 * Fora de producao liga em 3 cenarios:
 * - environment.useMsw=true (build configuracao dev-offline)
 * - localStorage.NG_APP_USE_MSW='true' (override em dev sem mudar build)
 * - localhost/127.0.0.1 (login e jornadas locais de teste sem backend real)
 */
export function ehAmbienteDemo(): boolean {
  if (environment.production) return false;
  if (environment.useMsw) return true;
  if (typeof window === 'undefined') return false;

  try {
    if (window.localStorage?.getItem('NG_APP_USE_MSW') === 'true') return true;
  } catch {
    // localStorage bloqueado (modo privado): segue para a checagem de host.
  }

  const host = window.location?.hostname;
  return host === 'localhost' || host === '127.0.0.1';
}
