// Formatacao apenas visual para a jornada de credito. Valores chegam como number
// BRL e datas como string ISO do backend; nada aqui interpreta regra de negocio.

export function formatarMoeda(valor: number, moeda: string): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: moeda }).format(valor);
}

export function formatarData(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(iso));
}

// Sufixo do UUID para identificacao curta em listas (o id completo permanece no link).
export function idCurto(id: string): string {
  return id.slice(-8);
}
