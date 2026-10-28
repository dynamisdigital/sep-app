import { PassoRoteiro } from '../tour.model';
import { comEntrada, trocarDeConta } from './passos-comuns';

// Capítulo 10 da jornada completa: tentativas de entrar por onde o perfil não deve. Em cada uma o tour
// digita um endereço que o menu não oferece àquela conta (a "porta dos fundos") e confere que o sistema
// barra. Serve à verificação de acesso: o bloqueio precisa existir mesmo sem link, e não só no menu.

const CREDOR = { email: 'credora-pf@empresa.com', quem: 'credor' };
const SUB = { email: 'mariana.exemplo@empresa.com', quem: 'sub-correspondente' };
const BACKOFFICE = { email: 'backoffice@empresa.com', quem: 'backoffice' };
const ACESSO_NEGADO = /^\/access-denied/;

function tentar(quem: string, rota: string, area: string, porque: string): PassoRoteiro[] {
  return [
    {
      titulo: `${quem} tenta abrir ${area}`,
      texto: `O ${quem} digita o endereço de ${area}, que o menu dele não mostra. ${porque}`,
      alvo: '.op-nav',
      acao: { tipo: 'navegar', rota },
      aguardarRota: ACESSO_NEGADO,
      aguardarAlvo: '.px42-card',
    },
    {
      titulo: 'Acesso negado',
      texto:
        'O sistema confere o perfil antes de abrir a tela e mostra o acesso negado. Sem permissão, não adianta saber o endereço.',
      alvo: '.px42-card',
      acao: { tipo: 'observar' },
    },
  ];
}

export function tentativasBloqueadas(): PassoRoteiro[] {
  const passos: PassoRoteiro[] = [
    {
      titulo: 'E o que não pode?',
      texto:
        'Uma operação completa também precisa mostrar o que não é permitido. Agora, três perfis tentam abrir áreas que não são deles, digitando o endereço.',
    },
    // A conta aberta aqui é a do credor, ao fim do capítulo anterior.
    ...tentar(
      'credor',
      '/app/credito',
      'o módulo de crédito',
      'O credor financia operações, mas não decide o crédito.',
    ),
    ...trocarDeConta(SUB.email, SUB.quem),
    ...tentar(
      'sub-correspondente',
      '/app/backoffice',
      'o backoffice',
      'O sub capta clientes, mas não opera a esteira interna.',
    ),
    ...trocarDeConta(BACKOFFICE.email, BACKOFFICE.quem),
    ...tentar(
      'backoffice',
      '/app/admin/users',
      'a gestão de usuários',
      'O backoffice trabalha a esteira, mas só a administração gere acessos.',
    ),
    {
      titulo: 'Fim da demonstração',
      texto:
        'Cada perfil fez o que lhe cabe, e o sistema barrou o que não lhe cabe. Os dados desta execução eram fictícios e voltam ao início na próxima.',
    },
  ];
  return comEntrada(
    passos.map((p) => ({ ...p, secao: 'Acessos bloqueados' })),
    trocarDeConta(CREDOR.email, CREDOR.quem),
  );
}
