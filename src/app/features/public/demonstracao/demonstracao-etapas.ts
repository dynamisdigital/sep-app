import { ContextoRoteiro, PassoRoteiro, Roteiro } from '../../../core/tour/tour.model';
import { ROTEIROS } from '../../../core/tour/roteiros';
import { jornadaReal } from '../../../core/tour/roteiros/jornada.roteiro';
import { trocarDeConta } from '../../../core/tour/roteiros/passos-comuns';
import { EXPERIENCIAS_VISUAIS } from './demonstracao-apresentacao';

interface Parte {
  roteiro?: string;
  capitulo?: string;
  ate?: string;
  conta?: string;
  /** Limita uma demonstração de consulta a um trecho específico do módulo. */
  de?: string;
  fim?: string;
}

// Cada posição corresponde ao cartão 01–05. Não se salta para uma seção de um
// tour maior: o roteiro gerado contém somente os passos da parte escolhida.
const PARTES: Record<string, readonly Parte[]> = {
  operacao_completa: [
    { capitulo: 'Sub-correspondente', ate: 'sub' },
    { capitulo: 'Tomador', ate: 'cadastro' },
    { capitulo: 'Credor', ate: 'aprovada' },
    { capitulo: 'Contrato', ate: 'alocada' },
    { capitulo: 'Desembolso e parcelas', ate: 'assinado' },
  ],
  correspondente: [
    { roteiro: 'correspondentes-prospeccao' },
    { roteiro: 'correspondentes-contratos', fim: 'Só os atrasos' },
    { roteiro: 'correspondentes-painel' },
    { roteiro: 'correspondentes-contratos', de: 'Tabela de operações' },
    { roteiro: 'correspondentes-comissoes' },
  ],
  subcorrespondente: [
    { roteiro: 'correspondentes-painel', ate: 'sub' },
    { capitulo: 'Sub-correspondente', ate: 'sub', fim: 'Submenu Envio de documentos' },
    { roteiro: 'correspondentes-contratos', ate: 'envio', fim: 'Só os atrasos' },
    { capitulo: 'Sub-correspondente', ate: 'envio', de: 'Submenu Envio de documentos' },
    { roteiro: 'correspondentes-comissoes', ate: 'quitada' },
  ],
  cliente: [
    { capitulo: 'Backoffice', ate: 'envio' },
    { capitulo: 'Tomador', ate: 'cadastro' },
    { capitulo: 'Análise', ate: 'proposta' },
    { capitulo: 'Contrato', ate: 'alocada' },
    { capitulo: 'Desembolso e parcelas', ate: 'assinado' },
  ],
  backoffice: [
    { roteiro: 'onboarding-visao-geral', ate: 'envio' },
    { roteiro: 'correspondentes-validacao', ate: 'envio' },
    { roteiro: 'credito-propostas', ate: 'proposta' },
    { roteiro: 'backoffice-tesouraria', ate: 'quitada' },
    { roteiro: 'backoffice-indicadores', ate: 'quitada' },
  ],
  financiador: [
    { roteiro: 'credora-cadastro', conta: 'credora-novo@empresa.com' },
    { roteiro: 'credora-oportunidades', conta: 'credora@empresa.com' },
    { roteiro: 'credora-escrow-alocacoes', ate: 'aprovada', conta: 'credora-pf@empresa.com' },
    { capitulo: 'Credor', ate: 'aprovada' },
    { capitulo: 'Retorno ao credor', ate: 'quitada' },
  ],
};

function faixa(passos: PassoRoteiro[], parte: Parte): PassoRoteiro[] {
  if (!parte.de && !parte.fim) return passos;
  const inicio = parte.de ? passos.findIndex((p) => p.titulo === parte.de) : 0;
  const fim = parte.fim ? passos.findIndex((p, i) => i > inicio && p.titulo === parte.fim) : -1;
  if (inicio < 0 || (parte.fim && fim < 0)) throw new Error('Trecho da etapa não encontrado.');
  // Preserva apenas a navegação necessária ao trecho, sem executar os formulários anteriores.
  const navegacao = passos
    .slice(0, inicio)
    .filter((p) => p.aguardarRota && p.acao?.tipo === 'clicar');
  return [...navegacao, ...passos.slice(inicio, fim < 0 ? undefined : fim)];
}

function passosDaParte(ctx: ContextoRoteiro, parte: Parte, perfil: string): PassoRoteiro[] {
  let passos: PassoRoteiro[];
  if (parte.capitulo) {
    const todos = jornadaReal.passos(ctx);
    const inicio = todos.findIndex((p) => p.secao === parte.capitulo);
    if (inicio < 0) throw new Error(`Capítulo não encontrado: ${parte.capitulo}`);
    const fim = todos.findIndex((p, i) => i > inicio && !!p.secao && p.secao !== parte.capitulo);
    passos = todos.slice(inicio, fim < 0 ? undefined : fim);
    const entrada = passos[0].entrada ?? [];
    passos = [...entrada, ...passos];
  } else {
    const origem = ROTEIROS.find((r) => r.id === parte.roteiro);
    if (!origem) throw new Error(`Roteiro não encontrado: ${parte.roteiro}`);
    const conta =
      parte.conta ??
      (perfil === 'backoffice'
        ? 'backoffice@empresa.com'
        : perfil === 'subcorrespondente'
          ? 'mariana.exemplo@empresa.com'
          : 'correspondente@empresa.com');
    passos = [...trocarDeConta(conta, perfil), ...faixa(origem.passos(ctx), parte)];
    return passos;
  }
  // Nos trechos de um capítulo, a entrada de conta precisa continuar presente.
  if (parte.de) {
    const login = passos.filter(
      (p) =>
        p.alvo === '#login-username' ||
        p.alvo === '#login-password' ||
        p.alvo === '.login-submit' ||
        p.alvo === '.landing-login' ||
        p.alvo === 'button[aria-label="Menu da conta"]' ||
        p.alvo === '.op-conta-sair',
    );
    return [
      ...login,
      ...faixa(
        passos.filter((p) => !login.includes(p)),
        parte,
      ),
    ];
  }
  return faixa(passos, parte);
}

export function roteiroDaEtapa(perfil: string, indice: number): Roteiro | undefined {
  const experiencia = EXPERIENCIAS_VISUAIS.find((e) => e.id === perfil);
  const etapa = experiencia?.steps[indice];
  const parte = PARTES[perfil]?.[indice];
  if (!experiencia || !etapa || !parte) return undefined;
  const titulo = `${experiencia.label} · ${String(indice + 1).padStart(2, '0')} · ${etapa.title}`;
  return {
    id: `demonstracao-etapa-${perfil}-${indice + 1}`,
    modulo: 'Demonstração',
    titulo,
    descricao: etapa.description,
    icone: experiencia.icone,
    duracao: '≈ 2 min',
    area: 'publica',
    papeis: [],
    rotaInicial: '/',
    rotaFinal: `/demonstracao/${perfil}`,
    reiniciarDemo: true,
    prepararAte: parte.ate,
    impedimento: (ctx) =>
      ctx.demo ? null : 'Disponível somente na demonstração com dados fictícios.',
    passos: (ctx) =>
      [
        {
          titulo: etapa.title,
          texto: `Você verá somente esta etapa: ${etapa.description} Os dados anteriores serão preparados. Ao terminar, voltaremos a este cenário. O botão maior apresenta o cenário inteiro.`,
        },
        ...passosDaParte(ctx, parte, perfil),
        {
          titulo: `Etapa ${String(indice + 1).padStart(2, '0')} concluída`,
          texto: `Terminamos ${etapa.title}. As outras etapas não serão iniciadas. Escolha outro cartão ou o botão maior para assistir ao cenário.`,
        },
      ].map((passo) => ({ ...passo, secao: etapa.title, entrada: undefined })),
  };
}
