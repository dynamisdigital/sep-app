import { ContextoRoteiro, PassoRoteiro, Roteiro } from '../tour.model';
import { jornadaReal } from './jornada.roteiro';

const PERFIS = [
  {
    id: 'correspondente',
    nome: 'Correspondente',
    secao: 'Correspondente',
    icone: 'handshake',
    antes: 'Etapa inicial do atendimento pela rede, com dados fictícios.',
    depois:
      'Depois, o subcorrespondente atende a carteira e envia documentos. Essa etapa não será executada aqui.',
  },
  {
    id: 'subcorrespondente',
    nome: 'Subcorrespondente',
    secao: 'Sub-correspondente',
    icone: 'users',
    antes:
      'O vínculo com o correspondente já estará preparado; não executaremos o cenário anterior.',
    depois: 'A seguir, o backoffice confere os documentos. Este tour termina antes dessa etapa.',
  },
  {
    id: 'cliente',
    nome: 'Cliente',
    secao: 'Tomador',
    icone: 'file-text',
    antes: 'O cadastro já estará preparado. A equipe registra o pedido em nome do cliente.',
    depois: 'A proposta seguirá para análise em outro cenário, que não será executado aqui.',
  },
  {
    id: 'backoffice',
    nome: 'Backoffice',
    secao: 'Backoffice',
    icone: 'briefcase',
    antes: 'Os documentos enviados pela rede já estarão preparados para a conferência.',
    depois:
      'Depois vêm o pedido e a análise de crédito; aqui encerramos a conferência e o cadastro.',
  },
  {
    id: 'financiador',
    nome: 'Financiador',
    secao: 'Credor',
    icone: 'wallet',
    antes: 'A proposta aprovada já estará preparada para a participação do financiador.',
    depois:
      'Formalização, liberação e recebimentos vêm depois e não serão executados neste cenário.',
  },
] as const;

/** Usa a faixa real do capítulo, incluindo passos sem marcação até o próximo capítulo. */
function passosDoCenario(ctx: ContextoRoteiro, perfil: (typeof PERFIS)[number]): PassoRoteiro[] {
  const todos = jornadaReal.passos(ctx);
  const inicio = todos.findIndex((passo) => passo.secao === perfil.secao);
  if (inicio < 0) throw new Error(`Cenário sem capítulo: ${perfil.id}`);
  const seguinte = todos.findIndex(
    (passo, indice) => indice > inicio && !!passo.secao && passo.secao !== perfil.secao,
  );
  const faixa = todos.slice(inicio, seguinte < 0 ? undefined : seguinte);
  const entrada = faixa[0].entrada ?? [];
  return [
    {
      titulo: `Somente o cenário ${perfil.nome}`,
      texto: `Este tour começa e termina no cenário ${perfil.nome}. ${perfil.antes} Para percorrer todos os perfis, escolha Operação completa.`,
    },
    ...entrada,
    ...faixa,
    {
      titulo: `Cenário ${perfil.nome} concluído`,
      texto: `${perfil.depois} Retornaremos à prévia deste perfil.`,
    },
  ].map((passo) => ({ ...passo, secao: perfil.nome, entrada: undefined }));
}

export const ROTEIROS_CENARIOS: Roteiro[] = PERFIS.map((perfil) => ({
  id: `jornada-cenario-${perfil.id}`,
  modulo: 'Jornadas práticas',
  titulo: `Cenário: ${perfil.nome}`,
  descricao: `Começa e termina em ${perfil.nome}, com orientação breve sobre o que vem antes e depois.`,
  icone: perfil.icone,
  duracao: '≈ 3 min',
  area: 'publica',
  papeis: [],
  rotaInicial: '/',
  rotaFinal: `/demonstracao/${perfil.id}`,
  reiniciarDemo: true,
  prepararAte: jornadaReal.prepararSecao?.[perfil.secao],
  impedimento: (ctx) =>
    ctx.demo ? null : 'Este cenário só roda no ambiente de demonstração, com dados fictícios.',
  passos: (ctx) => passosDoCenario(ctx, perfil),
}));

export const TOUR_POR_CENARIO: Readonly<Record<string, string>> = {
  operacao_completa: jornadaReal.id,
  ...Object.fromEntries(PERFIS.map((perfil) => [perfil.id, `jornada-cenario-${perfil.id}`])),
};
