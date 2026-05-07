export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@empresa.com`;
}

export const defaultPassword = '123456';
export const changedPassword = '654321';
