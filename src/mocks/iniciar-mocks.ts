// Liga o MSW no navegador. No build de producao este arquivo e trocado por
// `iniciar-mocks.prod.ts` (fileReplacements em angular.json), e assim nem os handlers, nem as
// contas ficticias, nem o segredo TOTP do mock chegam ao bundle publicado. (SEC-02)
export async function iniciarMocks(): Promise<void> {
  const { worker } = await import('./browser');
  await worker.start({ onUnhandledRequest: 'bypass' });
}
