/**
 * SEP — Frontend
 *
 * Frontend Development:
 * Daniel Möllmann
 *
 * Angular • TypeScript • SCSS
 * 2026
 */

// Formatacao e mascaras no padrao brasileiro, em um unico lugar. Regra do projeto: todo numero
// apresentado ao usuario usa ponto no milhar e virgula no decimal, e todo campo de entrada com
// formato conhecido (CPF, CNPJ, telefone, CEP, moeda) e mascarado enquanto se digita.
//
// A separacao importante: `formatar*` produz texto para a tela; `desformatar*` devolve o valor
// canonico que vai para o backend. Nenhuma tela deve mandar texto mascarado para a API.

// ============ NUMEROS ============

/** 1234.5 -> "1.234,50". `casas` fixa as decimais; por padrao usa as que o numero tiver. */
export function formatarNumero(valor: number, casas?: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: casas ?? 0,
    maximumFractionDigits: casas ?? 2,
  }).format(valor);
}

/** 1234.5 -> "R$ 1.234,50". */
export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor);
}

/** 0.0325 -> "3,25%". */
export function formatarPercentual(fracao: number, casas = 2): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  }).format(fracao);
}

/**
 * Duracao em milissegundos para leitura humana: 8133000 -> "2h 15min", 2700000 -> "45min",
 * 190800000 -> "2d 5h". Arredonda para o minuto; abaixo de um minuto, "menos de 1min".
 */
export function formatarDuracao(ms: number): string {
  const minutos = Math.round(ms / 60_000);
  if (minutos < 1) return 'menos de 1min';
  const dias = Math.floor(minutos / 1440);
  const horas = Math.floor((minutos % 1440) / 60);
  const resto = minutos % 60;
  if (dias > 0) return horas > 0 ? `${dias}d ${horas}h` : `${dias}d`;
  if (horas > 0) return resto > 0 ? `${horas}h ${resto}min` : `${horas}h`;
  return `${resto}min`;
}

// ============ DATAS ============

export function formatarData(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(iso));
}

export function formatarDataHora(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(iso),
  );
}

/** LocalDate 'yyyy-MM-dd' sem passar por Date, que interpretaria a string como UTC. */
export function formatarDataLocal(isoDate: string): string {
  const [ano, mes, dia] = isoDate.split('-');
  return `${dia}/${mes}/${ano}`;
}

// ============ MASCARAS ============

export function apenasDigitos(texto: string): string {
  return texto.replace(/\D+/g, '');
}

export function mascararCpf(texto: string): string {
  const d = apenasDigitos(texto).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2');
}

export function mascararCnpj(texto: string): string {
  const d = apenasDigitos(texto).slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

/** Decide pelo comprimento: ate 11 digitos e CPF, acima disso e CNPJ. */
export function mascararCpfCnpj(texto: string): string {
  const d = apenasDigitos(texto);
  return d.length <= 11 ? mascararCpf(d) : mascararCnpj(d);
}

/** Fixo "(11) 3333-4444" e celular "(11) 93333-4444". */
export function mascararTelefone(texto: string): string {
  const d = apenasDigitos(texto).slice(0, 11);
  if (d.length <= 2) return d.replace(/^(\d{0,2})/, '($1');
  if (d.length <= 6) return d.replace(/^(\d{2})(\d{0,4})/, '($1) $2');
  if (d.length <= 10) return d.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
  return d.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
}

export function mascararCep(texto: string): string {
  const d = apenasDigitos(texto).slice(0, 8);
  return d.replace(/^(\d{5})(\d{1,3})$/, '$1-$2');
}

/**
 * Moeda digitada da direita para a esquerda: os digitos entram como centavos, entao "1500"
 * vira "15,00" e "1500000" vira "15.000,00". E o unico comportamento que nao obriga o usuario
 * a acertar o separador decimal sozinho.
 */
export function mascararMoeda(texto: string): string {
  const d = apenasDigitos(texto).slice(0, 15);
  if (!d) return '';
  return formatarNumero(Number(d) / 100, 2);
}

/** "15.000,00" -> 15000. Aceita tambem o canonico "15000.00" vindo do backend. */
export function desformatarNumero(texto: string): number {
  const limpo = texto.trim();
  if (!limpo) return Number.NaN;
  // Se tem virgula, ela e o separador decimal e os pontos sao milhar.
  const canonico = limpo.includes(',')
    ? limpo.replace(/\./g, '').replace(',', '.')
    : limpo.replace(/\s/g, '');
  return Number(canonico.replace(/[^\d.-]/g, ''));
}

/** Valor canonico para o backend: "15.000,00" -> "15000.00". */
export function paraDecimalCanonico(texto: string, casas = 2): string {
  const numero = desformatarNumero(texto);
  return Number.isNaN(numero) ? texto.trim() : numero.toFixed(casas);
}

export type TipoMascara = 'cpf' | 'cnpj' | 'cpf-cnpj' | 'telefone' | 'cep' | 'moeda' | 'numero';

export function aplicarMascara(tipo: TipoMascara, texto: string): string {
  switch (tipo) {
    case 'cpf':
      return mascararCpf(texto);
    case 'cnpj':
      return mascararCnpj(texto);
    case 'cpf-cnpj':
      return mascararCpfCnpj(texto);
    case 'telefone':
      return mascararTelefone(texto);
    case 'cep':
      return mascararCep(texto);
    case 'moeda':
      return mascararMoeda(texto);
    case 'numero': {
      const d = apenasDigitos(texto);
      return d ? formatarNumero(Number(d)) : '';
    }
  }
}

// ============ PARAMETRO OPERACIONAL ============

/**
 * O catalogo de parametros guarda tudo como texto canonico ("15000.00", "true"). Na tela o
 * numero precisa sair no padrao brasileiro, e o booleano em portugues; STRING passa intacta,
 * porque ali o valor e um identificador e nao um numero.
 */
export function formatarValorParametro(valor: string, tipo: string): string {
  if (tipo === 'BOOLEAN') return valor === 'true' ? 'Sim' : 'Nao';
  if (tipo === 'DECIMAL') {
    const numero = Number(valor);
    return Number.isNaN(numero) ? valor : formatarNumero(numero, 2);
  }
  if (tipo === 'INTEGER') {
    const numero = Number(valor);
    return Number.isNaN(numero) ? valor : formatarNumero(numero, 0);
  }
  return valor;
}
