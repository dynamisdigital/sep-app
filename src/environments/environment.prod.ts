// Build de producao (`ng build`, configuracao padrao). `production: true` desliga o modo de
// demonstracao por completo: sem MSW, sem contas ficticias e sem override por localStorage.
//
// PENDENTE (Infra, SEC-04): `apiBaseUrl` ainda aponta para o backend local, como antes desta
// auditoria. Antes de publicar, substituir pela URL HTTPS do gateway da API (ou por um caminho
// relativo servido pelo mesmo dominio, ex. '/api/v1'). HTTP puro em producao expoe o token.
export const environment = {
  production: true,
  apiBaseUrl: 'http://localhost:8080/api/v1',
  useMsw: false,
};
