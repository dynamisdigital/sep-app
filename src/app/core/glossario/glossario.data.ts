// Glossário técnico do Dynamis SEP. Cada verbete diz o que o termo significa e em qual módulo ele
// aparece; `modulos` alimenta o filtro da tela e o trecho "Usado em" de cada resumo. Ao criar uma tela
// ou um termo novo, acrescente o verbete aqui: a tela do glossário se monta sozinha a partir desta lista.

export type ModuloGlossario =
  | 'Plataforma'
  | 'Onboarding'
  | 'Crédito'
  | 'Formalização'
  | 'Cobrança'
  | 'Pix'
  | 'Backoffice'
  | 'Meu Back Office'
  | 'Correspondentes'
  | 'Credora'
  | 'Administração'
  | 'Perfil e segurança'
  | 'Site público';

export interface Verbete {
  termo: string;
  resumo: string;
  modulos: ModuloGlossario[];
  /** Onde o termo aparece dentro dos módulos, em linguagem de menu. */
  usadoEm: string;
}

export const MODULOS_GLOSSARIO: ModuloGlossario[] = [
  'Plataforma',
  'Onboarding',
  'Crédito',
  'Formalização',
  'Cobrança',
  'Pix',
  'Backoffice',
  'Meu Back Office',
  'Correspondentes',
  'Credora',
  'Administração',
  'Perfil e segurança',
  'Site público',
];

export const GLOSSARIO: Verbete[] = [
  {
    termo: 'SEP',
    resumo:
      'Sociedade de Empréstimo entre Pessoas: a instituição regulada que reúne empresas e pessoas que buscam capital de giro e credores dispostos a financiá-las, com a análise de risco explicada e o dinheiro em conta segregada.',
    modulos: ['Plataforma', 'Site público'],
    usadoEm: 'Página inicial do site e Dashboard.',
  },
  {
    termo: 'Regimento do SEP',
    resumo:
      'Conjunto de regras da operação. Entre elas está o valor máximo de R$ 15.000 por operação, que a plataforma aplica na proposta e na alocação.',
    modulos: ['Crédito', 'Credora', 'Site público'],
    usadoEm: 'Crédito › Nova proposta; Credora › Alocar recursos; página Como funciona.',
  },
  {
    termo: 'Capital de giro',
    resumo:
      'Crédito que a empresa toma para cobrir o dia a dia (estoque, fornecedores, folha). É o produto que os credores financiam na plataforma.',
    modulos: ['Crédito', 'Site público'],
    usadoEm: 'Crédito › Propostas e página Crédito para empresas.',
  },
  {
    termo: 'Tomador',
    resumo:
      'Pessoa física ou empresa que pede o crédito e paga as parcelas. É quem passa pelo onboarding e tem a proposta analisada.',
    modulos: ['Onboarding', 'Crédito', 'Cobrança'],
    usadoEm: 'Onboarding › Pessoa e Empresa; Crédito › Propostas.',
  },
  {
    termo: 'Credor (credora)',
    resumo:
      'Quem financia as operações com o próprio dinheiro. Na plataforma a jornada do credor fica no módulo Credora, separada da operação interna.',
    modulos: ['Credora', 'Backoffice'],
    usadoEm: 'Menu Credora e Backoffice › Credores.',
  },
  {
    termo: 'Onboarding',
    resumo:
      'Cadastro e verificação de quem vai operar: dados da pessoa ou da empresa, documentos e checagens de identidade antes de qualquer proposta.',
    modulos: ['Onboarding'],
    usadoEm: 'Onboarding › Pessoa e Onboarding › Empresa.',
  },
  {
    termo: 'KYC',
    resumo:
      'Know Your Customer: verificação de identidade de pessoa física (documento, dados e conferência com bases oficiais).',
    modulos: ['Onboarding', 'Credora'],
    usadoEm: 'Onboarding › Pessoa; Credora › Cadastro.',
  },
  {
    termo: 'KYB',
    resumo:
      'Know Your Business: o mesmo tipo de verificação aplicado à empresa, incluindo sócios, contrato social e situação cadastral.',
    modulos: ['Onboarding'],
    usadoEm: 'Onboarding › Empresa.',
  },
  {
    termo: 'PLD',
    resumo:
      'Prevenção à Lavagem de Dinheiro: conjunto de checagens que busca identificar origem suspeita de recursos e barra o cadastro ou a operação quando há risco.',
    modulos: ['Onboarding', 'Credora', 'Site público'],
    usadoEm: 'Onboarding e Credora › Cadastro; selo na página inicial.',
  },
  {
    termo: 'Proposta',
    resumo:
      'Pedido de crédito com valor, prazo, parcela e custo total. Passa por análise e termina aprovada, recusada ou cancelada.',
    modulos: ['Crédito'],
    usadoEm: 'Crédito › Propostas.',
  },
  {
    termo: 'Análise de crédito',
    resumo:
      'Avaliação da proposta pelo backoffice: leitura do score, dos dados financeiros e dos documentos, que resulta em um parecer.',
    modulos: ['Crédito', 'Backoffice'],
    usadoEm: 'Crédito › Propostas › Análise; Backoffice › Fila.',
  },
  {
    termo: 'Parecer',
    resumo:
      'Conclusão registrada pelo analista sobre a proposta, com a justificativa. Fica no histórico para auditoria.',
    modulos: ['Crédito', 'Backoffice'],
    usadoEm: 'Crédito › Análise da proposta.',
  },
  {
    termo: 'Score',
    resumo:
      'Nota de risco da operação, calculada a partir de seis fatores que a tela explica um a um. Um score melhor não garante aprovação.',
    modulos: ['Crédito', 'Credora', 'Site público'],
    usadoEm: 'Crédito › Análise; Credora › Oportunidades.',
  },
  {
    termo: 'Faixa de risco (A a E)',
    resumo:
      'Classificação do score em cinco faixas, de A (menor risco) a E (maior risco). O credor vê a faixa de cada operação antes de alocar.',
    modulos: ['Crédito', 'Credora'],
    usadoEm: 'Crédito › Análise; Credora › Oportunidades.',
  },
  {
    termo: 'Open Finance',
    resumo:
      'Compartilhamento de dados bancários do tomador, com o consentimento dele, para a análise enxergar renda e movimentação reais.',
    modulos: ['Crédito'],
    usadoEm: 'Crédito › Propostas › Open Finance e retorno do consentimento.',
  },
  {
    termo: 'Consentimento',
    resumo:
      'Autorização dada pelo titular para usar seus dados ou debitar sua conta. Pode ser revogada, e a tela registra a data e o escopo.',
    modulos: ['Crédito', 'Perfil e segurança'],
    usadoEm: 'Crédito › Open Finance e Pix Automático.',
  },
  {
    termo: 'Pix Automático',
    resumo:
      'Débito recorrente das parcelas autorizado pelo tomador. Reduz o risco de esquecer um vencimento e melhora o score na análise.',
    modulos: ['Crédito', 'Cobrança', 'Pix', 'Site público'],
    usadoEm: 'Crédito › Pix Automático; Cobrança › Agenda de parcelas.',
  },
  {
    termo: 'Formalização',
    resumo:
      'Etapa em que a proposta aprovada vira contrato: geração do documento, assinatura e condições cumpridas antes da liberação.',
    modulos: ['Formalização'],
    usadoEm: 'Formalização › Proposta e Contratos.',
  },
  {
    termo: 'Contrato',
    resumo:
      'Documento que registra valor, prazo, taxa, parcelas e partes da operação. Cada contrato tem a própria agenda de parcelas.',
    modulos: ['Formalização', 'Cobrança', 'Meu Back Office'],
    usadoEm: 'Formalização › Contratos; Meu Back Office › Contratos.',
  },
  {
    termo: 'Assinatura',
    resumo:
      'Aceite do contrato pelas partes. A liberação do dinheiro só acontece depois de todas as assinaturas e condições.',
    modulos: ['Formalização'],
    usadoEm: 'Formalização › Detalhe do contrato.',
  },
  {
    termo: 'Liberação',
    resumo:
      'Saída do valor contratado da conta escrow para o tomador, depois de cumpridas as condições do contrato.',
    modulos: ['Formalização', 'Pix'],
    usadoEm: 'Formalização › Contrato; Pix › Desembolsos.',
  },
  {
    termo: 'Parcela',
    resumo:
      'Cada pagamento mensal do contrato, com vencimento, valor e situação (a vencer, paga, em atraso).',
    modulos: ['Cobrança', 'Credora'],
    usadoEm: 'Cobrança › Agenda e Parcela; Credora › Carteira.',
  },
  {
    termo: 'Agenda de parcelas',
    resumo:
      'Calendário das parcelas de um contrato (ou de toda a carteira), usado para acompanhar vencimentos e recebimentos.',
    modulos: ['Cobrança'],
    usadoEm: 'Cobrança › Contratos › Agenda e Financeiro › Agenda.',
  },
  {
    termo: 'Inadimplência',
    resumo:
      'Situação de parcela vencida e não paga. A tela de inadimplência lista os casos por tempo de atraso para a equipe agir.',
    modulos: ['Cobrança'],
    usadoEm: 'Cobrança › Financeiro › Inadimplência.',
  },
  {
    termo: 'Régua de cobrança',
    resumo:
      'Sequência de ações automáticas e manuais por tempo de atraso: lembrete, contato, renegociação e encaminhamento.',
    modulos: ['Cobrança'],
    usadoEm: 'Cobrança › Inadimplência.',
  },
  {
    termo: 'Renegociação',
    resumo:
      'Novo acordo para uma dívida em atraso, com prazo e valor reorganizados. Gera novas parcelas e fica no histórico do contrato.',
    modulos: ['Cobrança'],
    usadoEm: 'Cobrança › Parcela e Inadimplência.',
  },
  {
    termo: 'Conta escrow',
    resumo:
      'Conta segregada que guarda o dinheiro da operação, separado do patrimônio da plataforma. Nenhuma saída acontece sem a condição prevista.',
    modulos: ['Credora', 'Backoffice', 'Site público'],
    usadoEm: 'Credora › Conta; Backoffice › Tesouraria.',
  },
  {
    termo: 'Segregação patrimonial',
    resumo:
      'Princípio de manter o dinheiro dos credores em conta própria, fora do patrimônio da plataforma, protegido em caso de problema financeiro dela.',
    modulos: ['Credora', 'Site público'],
    usadoEm: 'Credora › Conta e páginas Segurança e Como funciona.',
  },
  {
    termo: 'Tesouraria',
    resumo:
      'Visão do caixa da escrow: entradas, saídas, saldos e movimentos pendentes, para o financeiro conferir a conta.',
    modulos: ['Backoffice'],
    usadoEm: 'Backoffice › Tesouraria.',
  },
  {
    termo: 'Extrato',
    resumo:
      'Lista cronológica dos lançamentos da conta do credor: aportes, alocações, recebimentos e saques.',
    modulos: ['Credora'],
    usadoEm: 'Credora › Conta.',
  },
  {
    termo: 'Alocação',
    resumo:
      'Parte do saldo do credor destinada a uma operação. O valor sai da conta livre e fica comprometido até as parcelas voltarem.',
    modulos: ['Credora'],
    usadoEm: 'Credora › Alocações e Oportunidades.',
  },
  {
    termo: 'Oportunidade',
    resumo:
      'Operação aberta para financiamento, mostrada ao credor com valor, prazo, faixa de risco e fatores do score.',
    modulos: ['Credora'],
    usadoEm: 'Credora › Oportunidades.',
  },
  {
    termo: 'Carteira',
    resumo:
      'Conjunto das operações em que o credor alocou recursos, com a situação de cada parcela. No módulo Meu Back Office, é a base de clientes do correspondente.',
    modulos: ['Credora', 'Meu Back Office'],
    usadoEm: 'Credora › Carteira; Meu Back Office › Minha base.',
  },
  {
    termo: 'Saque',
    resumo:
      'Retirada do saldo livre do credor para a conta bancária dele. Passa por confirmação adicional e conferência da conta de destino.',
    modulos: ['Credora', 'Perfil e segurança'],
    usadoEm: 'Credora › Saques.',
  },
  {
    termo: 'Credor inelegível',
    resumo:
      'Credor que ainda não cumpre os requisitos para alocar (cadastro incompleto, verificação pendente ou limite). A tela explica o que falta.',
    modulos: ['Credora'],
    usadoEm: 'Credora › Cadastro e Perfil.',
  },
  {
    termo: 'Desembolso',
    resumo:
      'Pagamento por Pix do valor contratado ao tomador, acompanhado até a confirmação do banco.',
    modulos: ['Pix'],
    usadoEm: 'Pix › Desembolsos.',
  },
  {
    termo: 'Recebimento',
    resumo:
      'Entrada de dinheiro por Pix referente a uma parcela, vinculada ao contrato pela referência do pagamento.',
    modulos: ['Pix'],
    usadoEm: 'Pix › Recebimentos.',
  },
  {
    termo: 'Divergência',
    resumo:
      'Diferença entre o que a plataforma esperava e o que o banco informou (valor, referência ou situação). Fica numa fila até ser resolvida.',
    modulos: ['Pix'],
    usadoEm: 'Pix › Divergências.',
  },
  {
    termo: 'Conciliação',
    resumo:
      'Conferência entre os lançamentos da plataforma e os movimentos do banco, para os números fecharem.',
    modulos: ['Pix', 'Backoffice'],
    usadoEm: 'Pix › Recebimentos e Divergências; Backoffice › Tesouraria.',
  },
  {
    termo: 'Webhook',
    resumo:
      'Aviso automático que o banco ou o provedor envia ao sistema quando algo acontece (um Pix pago, por exemplo).',
    modulos: ['Backoffice', 'Pix'],
    usadoEm: 'Backoffice › Reprocessos › Webhook.',
  },
  {
    termo: 'Reprocesso',
    resumo:
      'Nova execução de um evento que falhou ou ficou pendente, feita pela equipe, sem duplicar o efeito. Pode ser por provedor ou por webhook.',
    modulos: ['Backoffice'],
    usadoEm: 'Backoffice › Reprocessos.',
  },
  {
    termo: 'Idempotência',
    resumo:
      'Garantia de que repetir a mesma operação não a executa duas vezes. É o que permite reprocessar com segurança.',
    modulos: ['Backoffice', 'Pix'],
    usadoEm: 'Backoffice › Reprocessos; Pix › Desembolsos.',
  },
  {
    termo: 'Fila de trabalho',
    resumo:
      'Lista dos itens que esperam ação do backoffice (análises, pendências, exceções), com responsável e prazo.',
    modulos: ['Backoffice'],
    usadoEm: 'Backoffice › Fila.',
  },
  {
    termo: 'Correspondente',
    resumo:
      'Parceiro que capta clientes e acompanha as operações em nome da plataforma, recebendo comissão pelos contratos fechados.',
    modulos: ['Meu Back Office', 'Correspondentes'],
    usadoEm: 'Meu Back Office (visão do correspondente) e Correspondentes (visão da rede).',
  },
  {
    termo: 'Sub-correspondente',
    resumo:
      'Parceiro ligado a um correspondente, formando a rede dele. A comissão se divide conforme as regras da rede.',
    modulos: ['Meu Back Office', 'Correspondentes'],
    usadoEm: 'Meu Back Office › Minha rede; Correspondentes › Detalhe.',
  },
  {
    termo: 'Funil de prospecção',
    resumo:
      'Etapas por que passa um contato até virar cliente: lead, contato, proposta e contrato. Mostra onde cada oportunidade está.',
    modulos: ['Meu Back Office'],
    usadoEm: 'Meu Back Office › Prospecção.',
  },
  {
    termo: 'Lead',
    resumo: 'Contato com potencial de virar cliente, ainda no início do funil.',
    modulos: ['Meu Back Office'],
    usadoEm: 'Meu Back Office › Prospecção e Agenda.',
  },
  {
    termo: 'Atesto',
    resumo:
      'Declaração do correspondente de que conferiu os documentos enviados pelo cliente antes de eles seguirem para a validação do backoffice.',
    modulos: ['Meu Back Office', 'Backoffice'],
    usadoEm: 'Meu Back Office › Envio de documentos; Backoffice › Validar envios.',
  },
  {
    termo: 'Comissão',
    resumo:
      'Valor devido ao correspondente por contrato formalizado, calculado pelas regras de comissionamento da rede.',
    modulos: ['Meu Back Office', 'Correspondentes'],
    usadoEm: 'Meu Back Office › Comissões; Correspondentes › Comissões.',
  },
  {
    termo: 'Desempenho e metas',
    resumo:
      'Indicadores de produção do correspondente (propostas, contratos, valor) comparados com as metas definidas para a rede.',
    modulos: ['Meu Back Office', 'Correspondentes'],
    usadoEm: 'Meu Back Office › Desempenho; Correspondentes › Desempenho.',
  },
  {
    termo: 'Auditoria',
    resumo:
      'Registro de quem fez o quê e quando. Permite reconstituir uma decisão ou alteração depois dela acontecer.',
    modulos: ['Correspondentes', 'Administração'],
    usadoEm: 'Correspondentes › Auditoria; Administração › Usuários.',
  },
  {
    termo: 'Perfil de acesso (papel)',
    resumo:
      'Conjunto de permissões de um usuário: ADMIN, BACKOFFICE, FINANCEIRO, CORRESPONDENTE ou CLIENTE. O menu e as telas mudam conforme o papel.',
    modulos: ['Administração', 'Plataforma'],
    usadoEm: 'Administração › Usuários e menu lateral.',
  },
  {
    termo: 'Parâmetro operacional',
    resumo:
      'Valor de configuração do sistema (limite, prazo, taxa) com tipo definido, versão e histórico de alterações. Só o administrador altera.',
    modulos: ['Administração'],
    usadoEm: 'Administração › Parâmetros.',
  },
  {
    termo: 'MFA / TOTP',
    resumo:
      'Segundo fator de autenticação por código de uso único gerado em aplicativo autenticador. Protege o acesso além da senha.',
    modulos: ['Perfil e segurança'],
    usadoEm: 'Meu perfil › Habilitar MFA (TOTP).',
  },
  {
    termo: 'Confirmação adicional (step-up)',
    resumo:
      'Pedido de novo código antes de uma ação sensível (saque, alteração de parâmetro), mesmo com a sessão já aberta.',
    modulos: ['Perfil e segurança', 'Credora', 'Administração'],
    usadoEm: 'Tela Confirmação adicional, aberta por Saques e Parâmetros.',
  },
  {
    termo: 'LGPD',
    resumo:
      'Lei Geral de Proteção de Dados. Define como a plataforma coleta, guarda e usa dados pessoais, e os direitos do titular.',
    modulos: ['Perfil e segurança', 'Site público'],
    usadoEm: 'Política de privacidade e Meu perfil.',
  },
  {
    termo: 'FGC',
    resumo:
      'Fundo Garantidor de Créditos. Os investimentos em crédito no SEP não têm cobertura do FGC, e o aviso aparece nos banners e nas telas do credor.',
    modulos: ['Credora', 'Site público'],
    usadoEm: 'Credora › Oportunidades e página Financiadores.',
  },
  {
    termo: 'Tour assistido',
    resumo:
      'Roteiro guiado que executa a tarefa na tela, destacando cada campo, com música e narração opcionais. Fica no menu Ajuda.',
    modulos: ['Plataforma', 'Site público'],
    usadoEm: 'Menu Ajuda › Tours assistidos.',
  },
  {
    termo: 'Modo demonstração',
    resumo:
      'Ambiente com dados de exemplo, sem integração real. Permite trocar de usuário e treinar os fluxos sem gravar dados de verdade.',
    modulos: ['Plataforma'],
    usadoEm: 'Todo o sistema, com troca de usuário na barra de ícones.',
  },
  {
    termo: 'Dashboard',
    resumo:
      'Painel inicial com os indicadores do papel de quem entrou: carteira, filas, vencimentos e alertas.',
    modulos: ['Plataforma'],
    usadoEm: 'Menu › Dashboard.',
  },
];
