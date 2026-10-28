export type VersaoFotos = 'originais' | 'telas-escuras';

/** Somente fotografias que mostram a face iluminada de uma tela. */
const FOTOS_EDITADAS = new Set([
  'backoffice/01_triagem_cadastral',
  'backoffice/05_indicadores_auditoria',
  'cliente/01_cadastro_verificacao',
  'correspondente/03_acompanhamento',
  'correspondente/05_comissao_resultados',
  'financiador/01_cadastro_financiador',
  'financiador/03_analise_riscos_condicoes',
  'financiador/05_carteira_recebimentos',
  'subcorrespondente/01_ativacao_na_rede',
  'subcorrespondente/05_carteira_e_comissoes',
]);

/**
 * Fotografias cujas bordas brancas foram aparadas em versoes/bordas-corrigidas
 * (scripts/demonstracao/aparar-bordas.py). Os originais permanecem intactos.
 */
const BORDAS_APARADAS = new Set([
  'originais/cliente/03_analise_proposta',
  'originais/cliente/04_contratacao_liberacao',
  'originais/cliente/05_acompanhamento_quitacao',
  'originais/financiador/01_cadastro_financiador',
  'originais/financiador/02_selecao_oportunidades',
  'originais/financiador/03_analise_riscos_condicoes',
  'originais/financiador/04_formalizacao_participacao',
  'originais/financiador/05_carteira_recebimentos',
  'originais/subcorrespondente/01_ativacao_na_rede',
  'originais/subcorrespondente/02_atendimento_e_cadastro',
  'originais/subcorrespondente/03_propostas_e_acompanhamento',
  'originais/subcorrespondente/04_formalizacao',
  'originais/subcorrespondente/05_carteira_e_comissoes',
  'telas-escuras/financiador/03_analise_riscos_condicoes',
  'telas-escuras/financiador/05_carteira_recebimentos',
  'telas-escuras/subcorrespondente/01_ativacao_na_rede',
  'telas-escuras/subcorrespondente/05_carteira_e_comissoes',
]);

export function fotoDaDemonstracao(caminho: string, versao: VersaoFotos): string {
  const chave = caminho.replace(/^assets\//, '').replace(/\.(png|webp)$/, '');
  const escura = versao === 'telas-escuras' && FOTOS_EDITADAS.has(chave);
  const origem = escura ? 'telas-escuras' : 'originais';
  if (BORDAS_APARADAS.has(`${origem}/${chave}`))
    return caminho.replace(/^assets\//, `versoes/bordas-corrigidas/${origem}/`);
  return escura ? caminho.replace(/^assets\//, 'versoes/telas-escuras/') : caminho;
}
