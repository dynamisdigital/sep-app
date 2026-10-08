import { PassoRoteiro, Roteiro } from '../tour.model';
import { emSecao, peloMenu } from './passos-comuns';

// Tours do modulo de Correspondentes: a area do correspondente (Meu Back Office), a da
// administracao (Rede) e a validacao dos envios no backoffice. Cada roteiro parte do menu, como
// faria um operador. Os cliques que gravam (enviar documentos, apurar vigencia) levam `efeito: true`:
// fora da demonstracao eles so sao apontados.

const MODULO = 'Correspondentes';

const MENU_MEU_BACKOFFICE = {
  rota: '/app/meu-backoffice',
  titulo: 'Menu Meu Back Office',
  texto:
    'No menu lateral, em Jornadas, fica o Meu Back Office. Ele só aparece para quem tem o papel de correspondente.',
  aguardarAlvo: '.cor-kpis',
};

/** Do ponto em que estiver ate um submenu do Meu Back Office. */
function ateSubmenu(rota: string, titulo: string, texto: string, aguardar: string): PassoRoteiro[] {
  return peloMenu(MENU_MEU_BACKOFFICE, { rota, titulo, texto, aguardarAlvo: aguardar });
}

const ROTA_CONTRATO = /^\/app\/meu-backoffice\/contratos\/[^/?]+(\?.*)?$/;

// ============ CORRESPONDENTE ============

const painel: Roteiro = {
  id: 'correspondentes-painel',
  modulo: MODULO,
  titulo: 'Meu painel',
  icone: 'layout-dashboard',
  descricao: 'Validade do cadastro, indicadores da carteira, gráficos e o que pede atenção.',
  duracao: '≈ 2 min',
  papeis: ['CORRESPONDENTE'],
  passos: () => [
    {
      titulo: 'Seu painel de correspondente',
      texto:
        'Este roteiro mostra o painel de quem capta clientes para o SEP. Tudo começa no Dashboard, logo depois do login.',
    },
    ...peloMenu(MENU_MEU_BACKOFFICE),
    {
      titulo: 'Situação do cadastro',
      texto:
        'No topo, a situação e a validade do seu cadastro. Cadastro vencido ou desatualizado faz o cliente sair da sua base.',
      alvo: '[data-tour="cor-hero"]',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Indicadores da carteira',
      texto:
        'Os indicadores resumem o que você captou: clientes na base, contratos ativos, valor contratado, quanto falta receber, valor em atraso e a inadimplência.',
      alvo: '[data-tour="cor-kpis"]',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Gráficos',
      texto:
        'Os gráficos mostram a situação das operações, das parcelas e o quanto vence nos próximos meses. Passar o mouse no anel dá destaque.',
      alvo: '[data-tour="cor-graficos"]',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Precisa da sua atenção',
      texto:
        'Aqui aparecem os contratos em atraso dos seus clientes, os vínculos em risco e os envios devolvidos pelo backoffice, cada um com o atalho para resolver.',
      alvo: '[data-tour="cor-atencao"]',
      acao: { tipo: 'observar' },
    },
  ],
};

const contratos: Roteiro = {
  id: 'correspondentes-contratos',
  modulo: MODULO,
  titulo: 'Contratos e parcelas dos clientes',
  icone: 'file-check',
  descricao: 'Filtrar operações, ver quem está em dia e abrir as parcelas de um contrato.',
  duracao: '≈ 2 min',
  papeis: ['CORRESPONDENTE'],
  passos: () => [
    {
      titulo: 'Acompanhar o que você captou',
      texto:
        'Como foi você quem captou o cliente, é você quem acompanha o contrato dele. Este roteiro mostra como ver se está em dia e o valor de cada parcela.',
    },
    ...ateSubmenu(
      '/app/meu-backoffice/contratos',
      'Submenu Contratos',
      'O submenu Contratos lista as propostas e os contratos dos clientes da sua base.',
      '[data-tour="cor-contratos-tabela"]',
    ),
    {
      titulo: 'Filtros por situação',
      texto:
        'Os filtros separam as operações em dia, em atraso, quitadas e as propostas ainda em análise ou formalização.',
      alvo: '[data-tour="cor-filtros"]',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Só os atrasos',
      texto: 'Vamos filtrar os contratos em atraso, que são os que pedem contato com o cliente.',
      alvo: { css: '[data-tour="cor-filtros"] button', texto: 'Em atraso' },
      acao: { tipo: 'clicar' },
    },
    {
      titulo: 'Tabela de operações',
      texto:
        'Cada linha traz o cliente, o valor contratado, o valor da parcela, o andamento em parcelas pagas, o próximo vencimento e o valor em atraso. Linhas em atraso ganham destaque.',
      alvo: '[data-tour="cor-contratos-tabela"]',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Abrir as parcelas',
      texto: 'O botão Parcelas abre o contrato e mostra cada parcela, uma a uma.',
      alvo: { css: 'a.cor-btn', texto: 'Parcelas' },
      acao: { tipo: 'clicar' },
      aguardarRota: ROTA_CONTRATO,
      aguardarAlvo: '[data-tour="cor-parcelas"]',
    },
    {
      titulo: 'Valores do contrato',
      texto:
        'No topo, o valor contratado, o valor da parcela, quanto já foi pago, quanto falta receber e o que está em atraso.',
      alvo: '[data-tour="cor-contrato-kpis"]',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Parcela por parcela',
      texto:
        'A tabela mostra o vencimento, o valor, a situação, a data do pagamento e os dias de atraso de cada parcela. Você acompanha, mas a cobrança e a baixa são do SEP.',
      alvo: '[data-tour="cor-parcelas"]',
      acao: { tipo: 'observar' },
    },
  ],
};

const base: Roteiro = {
  id: 'correspondentes-base',
  modulo: MODULO,
  titulo: 'Minha base de clientes',
  icone: 'users',
  descricao: 'Os clientes vinculados a você, o histórico dos vínculos e os que estão em risco.',
  duracao: '≈ 1 min',
  papeis: ['CORRESPONDENTE'],
  passos: () => [
    {
      titulo: 'Sua base',
      texto: 'Este roteiro mostra os clientes vinculados a você e o que ameaça cada vínculo.',
    },
    ...ateSubmenu(
      '/app/meu-backoffice/base',
      'Submenu Minha base',
      'O submenu Minha base lista os clientes que estão, ou estiveram, vinculados a você.',
      '.cor-tabela',
    ),
    {
      titulo: 'Clientes e vínculos',
      texto:
        'Cada linha mostra o cliente, a situação do vínculo, as datas, a operação dele e se a última proposta assinada cita você. Quando não cita, o vínculo está em risco.',
      alvo: '.cor-tabela',
      acao: { tipo: 'observar' },
    },
  ],
};

const documentos: Roteiro = {
  id: 'correspondentes-documentos',
  modulo: MODULO,
  titulo: 'Enviar documentos com atesto',
  icone: 'file-up',
  descricao:
    'Escolher o cliente, anexar o documento, atestar a conferência e acompanhar o retorno.',
  duracao: '≈ 3 min',
  papeis: ['CORRESPONDENTE'],
  impedimento: (ctx) =>
    ctx.demo
      ? null
      : 'Este roteiro envia um documento de exemplo. Ele só roda no ambiente de demonstração.',
  passos: () => [
    {
      titulo: 'Documentos do cliente',
      texto:
        'Este roteiro envia os documentos de um cliente da sua base. O envio vai para a fila do backoffice, que valida.',
    },
    ...ateSubmenu(
      '/app/meu-backoffice/documentos',
      'Submenu Envio de documentos',
      'O submenu Envio de documentos reúne o formulário de envio e a lista dos seus envios.',
      'select[name="cliente"]',
    ),
    {
      titulo: 'Cliente da sua base',
      texto:
        'Só aparecem os clientes com vínculo vigente: você não envia documento de quem não é seu cliente.',
      alvo: 'select[name="cliente"]',
      acao: { tipo: 'selecionar', opcao: 'João da Silva' },
    },
    {
      titulo: 'Tipo de documento',
      texto: 'O tipo diz ao backoffice o que está sendo enviado.',
      alvo: 'select[name="tipo"]',
      acao: { tipo: 'selecionar', opcao: 'Documento de identidade' },
    },
    {
      titulo: 'Arquivo',
      texto: 'O arquivo do documento. Na demonstração, um arquivo de exemplo, sem dado real.',
      alvo: 'input[type="file"]',
      acao: { tipo: 'anexar', nome: 'documento-exemplo.pdf', tipoMime: 'application/pdf' },
    },
    {
      titulo: 'Atesto de conferência',
      texto:
        'O atesto é obrigatório. Ele registra que você conferiu os documentos com os originais, e esse registro fica guardado com data e hora.',
      alvo: 'input[name="atesto"]',
      acao: { tipo: 'clicar' },
    },
    {
      titulo: 'Enviar',
      texto:
        'Ao enviar, o documento é sinalizado como formalizado e entra na fila do backoffice, que valida ou devolve.',
      alvo: { css: 'button', texto: 'Enviar documentos' },
      acao: { tipo: 'clicar', efeito: true },
      aguardarAlvo: '.cor-aviso[role="status"]',
    },
    {
      titulo: 'Meus envios',
      texto:
        'O envio aparece aqui como Em validação. Quando o backoffice decidir, a situação muda e, se houver devolução, o motivo aparece ao lado.',
      alvo: { css: '.cor-card', texto: 'Meus envios' },
      acao: { tipo: 'observar' },
    },
  ],
};

const prospeccao: Roteiro = {
  id: 'correspondentes-prospeccao',
  modulo: MODULO,
  titulo: 'Funil de prospecção',
  icone: 'funnel',
  descricao: 'Cadastrar um prospect e acompanhá-lo do primeiro contato ao cliente ativo.',
  duracao: '≈ 2 min',
  papeis: ['CORRESPONDENTE'],
  passos: () => [
    {
      titulo: 'Quem ainda não contratou',
      texto:
        'Este roteiro mostra o funil de prospecção: onde você organiza quem ainda não virou cliente.',
    },
    ...ateSubmenu(
      '/app/meu-backoffice/prospeccao',
      'Submenu Prospecção',
      'O submenu Prospecção abre o funil, da captação ao cliente ativo.',
      '[data-tour="cor-funil"]',
    ),
    {
      titulo: 'Indicadores do funil',
      texto:
        'No topo, quantos prospects existem, quantos estão em andamento e o valor em potencial, a conversão e os perdidos.',
      alvo: '[data-tour="cor-funil-kpis"]',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Novo prospect',
      texto:
        'Aqui entra quem você acabou de conhecer: nome, tipo, telefone, produto e valor estimado.',
      alvo: '[data-tour="cor-funil-novo"]',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'As etapas do funil',
      texto:
        'Cada coluna é uma etapa: prospectado, contatado, em negociação, documentação, análise de crédito, aprovado, contratado e ativo.',
      alvo: '[data-tour="cor-funil"]',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Avançar um prospect',
      texto:
        'O botão de cada cartão leva o prospect para a próxima etapa. É um registro seu: a análise e a decisão de crédito continuam do SEP.',
      alvo: { css: '.cor-prospect button', texto: '▸' },
      acao: { tipo: 'clicar', efeito: true },
    },
    {
      titulo: 'Quando o cliente desiste',
      texto:
        'O botão Perdido pede o motivo, que fica registrado para você ajustar a abordagem. A lista de perdidos aparece abaixo do funil.',
      alvo: { css: '.cor-prospect button', texto: 'Perdido' },
      acao: { tipo: 'observar' },
    },
  ],
};

const agenda: Roteiro = {
  id: 'correspondentes-agenda',
  modulo: MODULO,
  titulo: 'Agenda e relacionamento',
  icone: 'calendar-clock',
  descricao: 'Registrar contatos, marcar retornos e acompanhar pendências dos clientes.',
  duracao: '≈ 2 min',
  papeis: ['CORRESPONDENTE'],
  passos: () => [
    {
      titulo: 'Seu relacionamento com o cliente',
      texto:
        'Este roteiro mostra a agenda, onde ficam as ligações, visitas, retornos e pendências documentais.',
    },
    ...ateSubmenu(
      '/app/meu-backoffice/agenda',
      'Submenu Agenda',
      'O submenu Agenda reúne o que está marcado e o histórico de atendimento.',
      '[data-tour="cor-agenda-form"]',
    ),
    {
      titulo: 'Registrar ou agendar',
      texto:
        'O formulário serve aos dois usos: registrar o que já aconteceu ou agendar um compromisso futuro. Escolha o cliente, o tipo, a data e descreva.',
      alvo: '[data-tour="cor-agenda-form"]',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Compromissos',
      texto:
        'Os compromissos aparecem do mais próximo ao mais distante. O que passa da data vira atrasado, e o botão Concluir tira da fila.',
      alvo: '[data-tour="cor-agenda-compromissos"]',
      acao: { tipo: 'observar' },
    },
  ],
};

const comissoes: Roteiro = {
  id: 'correspondentes-comissoes',
  modulo: MODULO,
  titulo: 'Minhas comissões',
  icone: 'wallet',
  descricao: 'Comissão acumulada, disponível, paga e prevista, e o histórico de lançamentos.',
  duracao: '≈ 2 min',
  papeis: ['CORRESPONDENTE'],
  passos: () => [
    {
      titulo: 'Quanto você ganha',
      texto:
        'Este roteiro mostra as suas comissões, calculadas sobre os contratos dos clientes que você captou.',
    },
    ...ateSubmenu(
      '/app/meu-backoffice/comissoes',
      'Submenu Comissões',
      'O submenu Comissões traz o resumo e o histórico.',
      '[data-tour="cor-comissoes-kpis"]',
    ),
    {
      titulo: 'Resumo',
      texto:
        'Acumulada é o que já foi gerado. Disponível aguarda o pagamento, paga já foi pelo Pix do SEP e prevista depende das parcelas ainda a vencer.',
      alvo: '[data-tour="cor-comissoes-kpis"]',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Histórico de lançamentos',
      texto:
        'Cada linha mostra a competência, o cliente, o evento (originação ou parcela recebida), a base, o percentual da regra vigente e a situação.',
      alvo: '[data-tour="cor-comissoes-livro"]',
      acao: { tipo: 'observar' },
    },
  ],
};

const desempenho: Roteiro = {
  id: 'correspondentes-desempenho',
  modulo: MODULO,
  titulo: 'Meu desempenho',
  icone: 'target',
  descricao: 'Metas, atingimento, posição na rede e conversão do funil.',
  duracao: '≈ 1 min',
  papeis: ['CORRESPONDENTE'],
  passos: () => [
    {
      titulo: 'Como você está indo',
      texto: 'Este roteiro mostra as suas metas e o seu resultado.',
    },
    ...ateSubmenu(
      '/app/meu-backoffice/desempenho',
      'Submenu Desempenho',
      'O submenu Desempenho compara o realizado com as metas do período.',
      '[data-tour="cor-metas"]',
    ),
    {
      titulo: 'Metas e atingimento',
      texto:
        'Duas metas: clientes captados e crédito originado. A barra mostra o quanto já foi atingido, e a cor indica se está perto ou longe.',
      alvo: '[data-tour="cor-metas"]',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Posição na rede',
      texto:
        'Sua colocação entre os correspondentes, por crédito originado. Os nomes e números dos demais não aparecem.',
      alvo: '[data-tour="cor-posicao"]',
      acao: { tipo: 'observar' },
    },
  ],
};

const relatorios: Roteiro = {
  id: 'correspondentes-relatorios',
  modulo: MODULO,
  titulo: 'Relatórios da carteira',
  icone: 'clipboard-list',
  descricao: 'Os arquivos CSV disponíveis e o que cada um traz.',
  duracao: '≈ 1 min',
  papeis: ['CORRESPONDENTE'],
  passos: () => [
    {
      titulo: 'Relatórios',
      texto: 'Este roteiro mostra os relatórios que você pode baixar.',
    },
    ...ateSubmenu(
      '/app/meu-backoffice/relatorios',
      'Submenu Relatórios',
      'O submenu Relatórios lista os arquivos disponíveis.',
      '[data-tour="cor-relatorios"]',
    ),
    {
      titulo: 'Cinco relatórios',
      texto:
        'Carteira de contratos, parcelas, comissões, funil e agenda. Cada arquivo CSV abre em planilha e traz só os dados da sua própria base.',
      alvo: '[data-tour="cor-relatorios"]',
      acao: { tipo: 'observar' },
    },
  ],
};

const minhaRede: Roteiro = {
  id: 'correspondentes-minha-rede',
  modulo: MODULO,
  titulo: 'Minha rede de sub-correspondentes',
  icone: 'network',
  descricao:
    'Credenciar sub-correspondentes, definir o repasse de cada um dentro do limite do SEP e acompanhar a carteira da rede.',
  duracao: '≈ 5 min',
  papeis: ['CORRESPONDENTE'],
  impedimento: (ctx) =>
    ctx.usuario === 'sub-correspondente@empresa.com'
      ? 'Este roteiro mostra a gestão da rede, que é do correspondente majoritário. Entre com a conta de correspondente majoritário.'
      : null,
  passos: () => [
    {
      titulo: 'Sua rede de sub-correspondentes',
      texto:
        'Este roteiro mostra como o correspondente majoritário credencia sub-correspondentes, que também lançam clientes, e acompanha a rede inteira.',
    },
    ...ateSubmenu(
      '/app/meu-backoffice/rede',
      'Submenu Minha rede',
      'O submenu Minha rede reúne os sub-correspondentes, os percentuais e a carteira da rede.',
      '[data-tour="cor-rede-kpis"]',
    ),
    {
      titulo: 'Resumo da rede',
      texto:
        'Os indicadores somam clientes, carteira e inadimplência da sua base e das bases dos subs. Mostram também a comissão bruta, o repasse aos subs e o que fica com você.',
      alvo: '[data-tour="cor-rede-kpis"]',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'O limite do SEP',
      texto:
        'Para cada produto, o SEP fixa o teto que você pode repassar a um sub-correspondente. O repasse sempre fica abaixo dele, e a diferença é a sua margem.',
      alvo: '[data-tour="cor-rede-tetos"]',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Sub-correspondentes',
      texto:
        'Cada sub mostra a situação do cadastro, clientes, carteira, inadimplência, a comissão dele e a sua margem. Os botões ajustam os percentuais, com justificativa, ou suspendem o sub.',
      alvo: '[data-tour="cor-rede-subs"]',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Comissão por origem',
      texto:
        'Aqui a comissão aparece separada por origem: a sua carteira e a de cada sub, com a parte bruta, o repasse e o que fica com você. A soma fecha com o total.',
      alvo: '[data-tour="cor-rede-comissoes"]',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Carteira da rede',
      texto:
        'Os contratos e propostas de toda a rede, com filtro por origem. Assim você acompanha o que cada sub captou e como a carteira está.',
      alvo: '[data-tour="cor-rede-carteira"]',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Novo sub-correspondente',
      texto:
        'Este botão abre o cadastro de um novo sub. Vamos preencher um exemplo, do nome aos percentuais de repasse por produto.',
      alvo: '[data-tour="cor-rede-novo"]',
      acao: { tipo: 'clicar' },
      aguardarAlvo: 'section[aria-labelledby="cor-novo-sub"] input[name="nome"]',
    },
    {
      titulo: 'Nome',
      texto: 'O nome da pessoa ou da empresa que vai captar clientes na sua rede.',
      alvo: 'section[aria-labelledby="cor-novo-sub"] input[name="nome"]',
      acao: { tipo: 'digitar', texto: () => 'Mariana Duarte Correspondências', limpar: true },
    },
    {
      titulo: 'CPF',
      texto:
        'O CPF identifica o sub no cadastro. Na demonstração, um número de exemplo, sem relação com pessoa real.',
      alvo: 'section[aria-labelledby="cor-novo-sub"] input[name="cpf"]',
      acao: { tipo: 'digitar', texto: () => '000.000.000-00', limpar: true },
    },
    {
      titulo: 'E-mail e telefone',
      texto:
        'Os contatos do sub. O e-mail vai ser o login dele depois que o SEP validar o cadastro.',
      alvo: 'section[aria-labelledby="cor-novo-sub"] input[name="email"]',
      acao: { tipo: 'digitar', texto: () => 'mariana.exemplo@empresa.com', limpar: true },
    },
    {
      titulo: 'Telefone',
      texto: 'O telefone para contato.',
      alvo: 'section[aria-labelledby="cor-novo-sub"] input[name="telefone"]',
      acao: { tipo: 'digitar', texto: () => '(11) 90000-0000', limpar: true },
    },
    {
      titulo: 'Repasse: capital de giro',
      texto:
        'Aqui você define quanto da sua comissão o sub recebe neste produto. O formulário mostra o teto que o SEP permite, e recusa qualquer valor acima dele.',
      alvo: 'section[aria-labelledby="cor-novo-sub"] .cor-form label:nth-of-type(5) input',
      acao: { tipo: 'digitar', texto: () => '1', limpar: true },
    },
    {
      titulo: 'Repasse: crédito pessoal',
      texto: 'O mesmo vale para o crédito pessoal, que tem o seu próprio teto.',
      alvo: 'section[aria-labelledby="cor-novo-sub"] .cor-form label:nth-of-type(6) input',
      acao: { tipo: 'digitar', texto: () => '1.5', limpar: true },
    },
    {
      titulo: 'Repasse: comissão recorrente',
      texto:
        'E o percentual sobre as parcelas recebidas. A diferença entre o que o SEP paga a você e o que você repassa é a sua margem.',
      alvo: 'section[aria-labelledby="cor-novo-sub"] .cor-form label:nth-of-type(7) input',
      acao: { tipo: 'digitar', texto: () => '0.2', limpar: true },
    },
    {
      titulo: 'Credenciar',
      texto:
        'Credenciar envia o cadastro. O sub só começa a lançar clientes depois que o SEP valida o cadastro dele.',
      alvo: { css: 'section[aria-labelledby="cor-novo-sub"] button', texto: 'Credenciar' },
      acao: { tipo: 'clicar', efeito: true },
      aguardarAlvo: '.cor-aviso[role="status"]',
    },
    {
      titulo: 'Sub na lista',
      texto:
        'O novo sub aparece na lista, aguardando a validação do cadastro pelo SEP, já com a margem que sobra para você.',
      alvo: '[data-tour="cor-rede-subs"]',
      acao: { tipo: 'observar' },
    },
  ],
};

const completoCorrespondente: Roteiro = {
  id: 'correspondentes-completo',
  modulo: MODULO,
  titulo: 'Módulo completo',
  icone: 'list-checks',
  descricao:
    'Os dez roteiros em sequência: painel, funil, agenda, contratos, base, documentos, comissões, desempenho, relatórios e minha rede.',
  duracao: '≈ 20 min',
  papeis: ['CORRESPONDENTE'],
  impedimento: (ctx) => documentos.impedimento?.(ctx) ?? minhaRede.impedimento?.(ctx) ?? null,
  passos: (ctx) => [
    ...emSecao(painel, ctx, { primeira: true }),
    ...emSecao(prospeccao, ctx),
    ...emSecao(agenda, ctx),
    ...emSecao(contratos, ctx),
    ...emSecao(base, ctx),
    ...emSecao(documentos, ctx),
    ...emSecao(comissoes, ctx),
    ...emSecao(desempenho, ctx),
    ...emSecao(relatorios, ctx),
    ...emSecao(minhaRede, ctx),
  ],
};

// ============ ADMINISTRACAO ============

const MENU_CORRESPONDENTES = {
  rota: '/app/correspondentes',
  titulo: 'Menu Correspondentes',
  texto: 'No menu lateral, em Operação, fica Correspondentes. Ele só aparece para a administração.',
  aguardarAlvo: '[data-tour="cor-rede-graficos"]',
};

const rede: Roteiro = {
  id: 'correspondentes-rede',
  modulo: MODULO,
  titulo: 'Rede de Correspondentes',
  icone: 'handshake',
  descricao: 'Credenciamento, validade, carteira da rede e o detalhe de cada correspondente.',
  duracao: '≈ 3 min',
  papeis: ['ADMIN'],
  passos: () => [
    {
      titulo: 'A rede de correspondentes',
      texto:
        'Este roteiro mostra a visão da administração: quem está credenciado, com que validade e quanto cada um carrega de carteira.',
    },
    ...peloMenu(MENU_CORRESPONDENTES),
    {
      titulo: 'Indicadores da rede',
      texto:
        'Os indicadores contam correspondentes, clientes em bases vigentes, clientes diretos com o SEP, cadastros a vencer, vencidos e os envios em validação.',
      alvo: '.cor-metrics',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Gráficos',
      texto:
        'O anel mostra a situação dos cadastros. As barras mostram a carteira de cada correspondente, e em âmbar fica quem tem parcelas vencidas.',
      alvo: '[data-tour="cor-rede-graficos"]',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Majoritários e sub-correspondentes',
      texto:
        'Na lista, cada correspondente majoritário vem seguido dos seus sub-correspondentes, com a etiqueta do nível. Assim a administração enxerga toda a hierarquia da rede.',
      alvo: '.cor-tabela',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Apuração de vigência',
      texto:
        'Este botão simula a rotina automática do sistema que encerra os vínculos de cadastro vencido. Os clientes ficam livres para eleger outro correspondente ou o SEP.',
      alvo: { css: 'button', texto: 'Apurar vigências' },
      acao: { tipo: 'clicar', efeito: true },
      aguardarAlvo: '.cor-aviso[role="status"]',
    },
    {
      titulo: 'Abrir um correspondente',
      texto: 'O detalhe mostra o cadastro, a renovação e todos os vínculos, com o histórico.',
      alvo: { css: 'a.cor-btn', texto: 'Abrir' },
      acao: { tipo: 'clicar' },
      aguardarRota: /^\/app\/correspondentes\/[^/?]+(\?.*)?$/,
      aguardarAlvo: '.cor-tabela',
    },
    {
      titulo: 'Renovar o cadastro',
      texto:
        'A renovação define a nova validade. Com o cadastro em dia, o correspondente volta a poder enviar documentos.',
      alvo: { css: 'button', texto: 'Renovar cadastro' },
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Vínculos e eleição do cliente',
      texto:
        'Cada vínculo guarda início, fim e motivo. Para registrar a eleição do cliente, escolha outro correspondente ou o SEP direto na última coluna.',
      alvo: '.cor-tabela',
      acao: { tipo: 'observar' },
    },
  ],
};

const ateSubmenuAdmin = (
  rota: string,
  titulo: string,
  texto: string,
  aguardar: string,
): PassoRoteiro[] =>
  peloMenu(MENU_CORRESPONDENTES, { rota, titulo, texto, aguardarAlvo: aguardar });

const comissoesAdmin: Roteiro = {
  id: 'correspondentes-comissionamento',
  modulo: MODULO,
  titulo: 'Comissionamento da rede',
  icone: 'percent',
  descricao: 'Regras de comissão configuráveis e o livro de comissões da rede.',
  duracao: '≈ 2 min',
  papeis: ['ADMIN'],
  passos: () => [
    {
      titulo: 'Regras que não estão no código',
      texto:
        'Este roteiro mostra onde a administração configura a comissão. Os percentuais são parâmetros, e não valores fixos no sistema.',
    },
    ...ateSubmenuAdmin(
      '/app/correspondentes/comissoes',
      'Submenu Comissões',
      'O submenu Comissões reúne as regras e o livro de comissões.',
      '[data-tour="cor-regras"]',
    ),
    {
      titulo: 'Regras por produto',
      texto:
        'Cada regra tem produto, base de cálculo, gatilho de pagamento e versão. Alterar o percentual exige justificativa e cria uma nova versão, que vai para a auditoria.',
      alvo: '[data-tour="cor-regras"]',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Teto de repasse aos subs',
      texto:
        'Na mesma tabela, a coluna Teto para subs fixa quanto o correspondente majoritário pode repassar aos seus sub-correspondentes em cada produto. Ela nunca passa do percentual da regra, e é com esse limite que o majoritário define a margem de cada sub.',
      alvo: '[data-tour="cor-regras"]',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Livro de comissões',
      texto:
        'Abaixo, os últimos lançamentos da rede. Cada um guarda a versão da regra usada, para explicar o valor meses depois.',
      alvo: { css: '.cor-card', texto: 'Últimos lançamentos' },
      acao: { tipo: 'observar' },
    },
  ],
};

const desempenhoAdmin: Roteiro = {
  id: 'correspondentes-desempenho-rede',
  modulo: MODULO,
  titulo: 'Desempenho e metas da rede',
  icone: 'trophy',
  descricao: 'Ranking por critério, qualidade da carteira e definição das metas.',
  duracao: '≈ 2 min',
  papeis: ['ADMIN'],
  passos: () => [
    {
      titulo: 'Como a rede está indo',
      texto: 'Este roteiro mostra o ranking dos correspondentes e as metas de cada um.',
    },
    ...ateSubmenuAdmin(
      '/app/correspondentes/desempenho',
      'Submenu Desempenho',
      'O submenu Desempenho traz o ranking e as metas.',
      '[data-tour="cor-ranking"]',
    ),
    {
      titulo: 'Ranking',
      texto:
        'O ranking pode ser ordenado por crédito originado, clientes, contratos, conversão, comissão, atingimento da meta ou qualidade da carteira.',
      alvo: '[data-tour="cor-ranking"]',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Metas',
      texto:
        'A meta de clientes e a de crédito de cada correspondente são definidas aqui. O atingimento é calculado sobre o realizado, e cada alteração vai para a auditoria.',
      alvo: '[data-tour="cor-metas-admin"]',
      acao: { tipo: 'observar' },
    },
  ],
};

const auditoria: Roteiro = {
  id: 'correspondentes-auditoria',
  modulo: MODULO,
  titulo: 'Auditoria do módulo',
  icone: 'scroll-text',
  descricao: 'Quem fez o quê e quando, com filtros e exportação.',
  duracao: '≈ 1 min',
  papeis: ['ADMIN'],
  passos: () => [
    {
      titulo: 'Trilha de auditoria',
      texto:
        'Este roteiro mostra o registro de tudo o que foi alterado no módulo, com autor, data e valores.',
    },
    ...ateSubmenuAdmin(
      '/app/correspondentes/auditoria',
      'Submenu Auditoria',
      'O submenu Auditoria lista os eventos do mais recente ao mais antigo.',
      '[data-tour="cor-auditoria"]',
    ),
    {
      titulo: 'Eventos',
      texto:
        'Cada evento mostra quem agiu, a ação, a entidade e o detalhe com o valor anterior e o novo. É possível filtrar por autor e por tipo de ação, e exportar em CSV.',
      alvo: '[data-tour="cor-auditoria"]',
      acao: { tipo: 'observar' },
    },
  ],
};

// ============ BACKOFFICE ============

const validacao: Roteiro = {
  id: 'correspondentes-validacao',
  modulo: MODULO,
  titulo: 'Validar envios de correspondentes',
  icone: 'shield-check',
  descricao: 'Onde chegam os documentos enviados pelos correspondentes e como validar ou devolver.',
  duracao: '≈ 1 min',
  papeis: ['BACKOFFICE', 'FINANCEIRO', 'ADMIN'],
  passos: () => [
    {
      titulo: 'Envios dos correspondentes',
      texto:
        'Este roteiro mostra onde o backoffice valida os documentos que os correspondentes enviam.',
    },
    ...peloMenu(
      {
        rota: '/app/backoffice',
        titulo: 'Menu Backoffice',
        texto: 'No menu lateral, em Operação, fica o Backoffice.',
      },
      {
        rota: '/app/backoffice/correspondentes',
        titulo: 'Submenu Envios de correspondentes',
        texto: 'O submenu Envios de correspondentes lista o que está aguardando decisão.',
        aguardarAlvo: '.cor-tabela',
      },
    ),
    {
      titulo: 'Envios e atesto',
      texto:
        'Cada linha traz o correspondente, o cliente, os documentos e o atesto de conferência. O atesto não substitui a sua validação.',
      alvo: '.cor-tabela',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Validar ou devolver',
      texto:
        'Validar aceita o envio. Devolver exige o motivo, que o correspondente lê no painel dele para corrigir e reenviar.',
      alvo: '.cor-tabela td:last-child',
      acao: { tipo: 'observar' },
    },
  ],
};

// O modulo tem duas faces: o correspondente usa o Meu Back Office, e a administracao gere a rede. Cada
// face tem o seu "Modulo completo", com as mesmas fichas de submodulo, para o cartao ser igual ao dos demais.
const completoAdmin: Roteiro = {
  id: 'correspondentes-completo-admin',
  modulo: MODULO,
  titulo: 'Módulo completo',
  icone: 'clipboard-check',
  descricao:
    'Os cinco roteiros da administração em sequência: rede, comissionamento, desempenho, auditoria e validação de envios.',
  duracao: '≈ 9 min',
  papeis: ['ADMIN'],
  passos: (ctx) => [
    ...emSecao(rede, ctx, { primeira: true }),
    ...emSecao(comissoesAdmin, ctx),
    ...emSecao(desempenhoAdmin, ctx),
    ...emSecao(auditoria, ctx),
    ...emSecao(validacao, ctx),
  ],
};

export const ROTEIROS_CORRESPONDENTES: Roteiro[] = [
  completoCorrespondente,
  completoAdmin,
  painel,
  prospeccao,
  agenda,
  contratos,
  base,
  documentos,
  comissoes,
  desempenho,
  relatorios,
  minhaRede,
  rede,
  comissoesAdmin,
  desempenhoAdmin,
  auditoria,
  validacao,
];
