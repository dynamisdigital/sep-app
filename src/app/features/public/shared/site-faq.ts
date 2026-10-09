// Perguntas frequentes do site do Dynamis SEP, todas sobre a sociedade de empréstimo entre pessoas.
// Os textos que citam regra do Banco Central ficam em termos gerais: o valor e o prazo exatos
// dependem da regulamentação vigente, conferida pelo jurídico antes de cada publicação.

export interface PerguntaFaq {
  pergunta: string;
  resposta: string;
}

export interface GrupoFaq {
  id: string;
  titulo: string;
  icone: string;
  itens: PerguntaFaq[];
}

export const FAQ: GrupoFaq[] = [
  {
    id: 'sep',
    titulo: 'Sobre a SEP',
    icone: 'handshake',
    itens: [
      {
        pergunta: 'O que é uma SEP?',
        resposta:
          'É uma sociedade de empréstimo entre pessoas: uma instituição regulada que reúne, em uma plataforma, quem precisa de crédito e quem quer financiá-lo. Ela analisa o crédito, formaliza o contrato e cobra as parcelas, mas não empresta dinheiro próprio.',
      },
      {
        pergunta: 'O Dynamis SEP é um banco?',
        resposta:
          'Não. Não captamos depósito nem oferecemos conta corrente. O dinheiro das operações vem de quem escolhe financiá-las.',
      },
      {
        pergunta: 'Pessoa física também pode pedir empréstimo?',
        resposta:
          'Sim. A pessoa física pede crédito em seu nome, depois do cadastro e da verificação, e vê valor, prazo, parcela e custo antes de enviar. O valor máximo por operação segue o regimento, e o pedido passa pela mesma análise explicada das empresas, sem promessa de aprovação.',
      },
      {
        pergunta: 'Onde fica o dinheiro das operações?',
        resposta:
          'Em conta segregada, separada do caixa do Dynamis SEP. A plataforma não pode manter recursos de credores em conta própria sem vínculo com uma operação.',
      },
      {
        pergunta: 'Como verifico se a plataforma é autorizada?',
        resposta:
          'A autorização para funcionar é concedida pelo Banco Central, e a lista de instituições autorizadas é pública. A página Transparência traz os dados de identificação do Dynamis SEP para a sua conferência.',
      },
    ],
  },
  {
    id: 'empresas',
    titulo: 'Para empresas que buscam crédito',
    icone: 'building-2',
    itens: [
      {
        pergunta: 'Quanto posso pedir?',
        resposta:
          'O limite por proposta é o definido no regimento do Dynamis SEP, e aparece na página Para empresas. Valor, prazo, parcela e custo aparecem na simulação, antes do envio.',
      },
      {
        pergunta: 'Quanto tempo leva a análise?',
        resposta:
          'Não prometemos prazo: ele depende da verificação do cadastro e da análise. Você acompanha cada etapa pela sua conta.',
      },
      {
        pergunta: 'Há taxa para analisar a proposta?',
        resposta:
          'Não. O Dynamis SEP não cobra para analisar proposta e nunca pede pagamento antecipado para liberar crédito. Desconfie de quem pedir.',
      },
      {
        pergunta: 'Como pago as parcelas?',
        resposta:
          'Pelo Pix, ou, se preferir, por Pix Automático: você autoriza uma vez, no aplicativo do seu banco, e cada parcela é debitada no vencimento. Além de reduzir o risco de esquecer, o Pix Automático ativo soma pontos ao seu score na análise de crédito. A autorização pode ser cancelada por você.',
      },
      {
        pergunta: 'O que acontece se eu atrasar?',
        resposta:
          'Há os encargos previstos no contrato, e a parcela entra em cobrança. É possível propor uma renegociação. Fale com a equipe antes do vencimento, quando souber que vai atrasar.',
      },
    ],
  },
  {
    id: 'investidores',
    titulo: 'Para investidores (credores)',
    icone: 'wallet',
    itens: [
      {
        pergunta: 'Quem pode financiar operações?',
        resposta:
          'Pessoas físicas e empresas, depois de se cadastrarem e passarem pela verificação de identidade, pela prevenção à lavagem de dinheiro e pela análise de perfil, com o registro de que entendem os riscos.',
      },
      {
        pergunta: 'Posso perder dinheiro?',
        resposta:
          'Sim. O risco de inadimplência é de quem financia. O Dynamis SEP não garante o pagamento das operações, e o investimento em crédito não conta com a cobertura do FGC.',
      },
      {
        pergunta: 'Existe limite de aporte?',
        resposta:
          'Para quem não é investidor qualificado, a regulamentação limita o valor que um credor pode emprestar a um mesmo tomador pela mesma SEP (R$ 15.000). Investidores qualificados, conforme a CVM, não têm esse limite.',
      },
      {
        pergunta: 'Quando recebo o retorno?',
        resposta:
          'A cada parcela paga pelo tomador, o valor é repassado ao credor em prazo curto definido pela regulamentação, que hoje é de até um dia útil.',
      },
      {
        pergunta: 'Posso resgatar antes do fim da operação?',
        resposta:
          'Não há resgate antecipado: o retorno vem com as parcelas. Pense no aporte como um valor que ficará parado até o fim do prazo da operação.',
      },
      {
        pergunta: 'Como o risco é classificado?',
        resposta:
          'Cada operação recebe um score calculado a partir de fontes de crédito e da capacidade de pagamento, e a faixa de A a E aparece na oportunidade, com a explicação de cada fator.',
      },
      {
        pergunta: 'O que significa diversificar?',
        resposta:
          'Dividir o capital entre várias operações, de faixas de risco, prazos e setores diferentes, para que uma única falha tenha efeito menor. Diversificar reduz o risco, mas não o elimina.',
      },
    ],
  },
  {
    id: 'seguranca',
    titulo: 'Segurança e proteção de dados',
    icone: 'shield-check',
    itens: [
      {
        pergunta: 'Recebi uma ligação pedindo depósito para liberar um empréstimo.',
        resposta:
          'É golpe. O Dynamis SEP não liga pedindo depósito nem pagamento antecipado. Desligue e avise pelo canal oficial.',
      },
      {
        pergunta: 'O Dynamis SEP pede senha ou código do autenticador?',
        resposta:
          'Nunca. Nem por telefone, e-mail ou mensagem. Se receber um pedido assim, não responda e avise pelo canal oficial.',
      },
      {
        pergunta: 'Por que o cadastro pede tantos documentos?',
        resposta:
          'Para confirmar quem é quem e a origem do dinheiro (KYC, KYB e prevenção à lavagem de dinheiro). Essas verificações protegem todos os participantes e são exigidas por lei.',
      },
      {
        pergunta: 'Meus dados são vendidos?',
        resposta:
          'Não. Os dados servem à operação e às obrigações legais, conforme a Lei Geral de Proteção de Dados. Você pode pedir acesso e correção pelo canal oficial.',
      },
    ],
  },
];

export function totalDePerguntas(): number {
  return FAQ.reduce((n, g) => n + g.itens.length, 0);
}
