export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@empresa.com`;
}

export const defaultPassword = '123456';
// A politica da tela de troca exige 12+ caracteres com maiuscula, minuscula, digito e simbolo
// (`change-password.component.ts`). Com "654321" o botao de salvar ficava permanentemente
// desabilitado e o teste travava no clique.
export const changedPassword = 'SepTroca#2026';
