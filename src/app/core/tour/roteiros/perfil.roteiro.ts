import { PassoRoteiro, Roteiro } from '../tour.model';
import { peloMenu } from './passos-comuns';

// Tours assistidos do Meu perfil. Servem a todos os papeis e nao gravam nada: trocar a senha ou
// ativar o TOTP mexe na credencial da conta, entao os roteiros so mostram a tela. Digitar uma senha
// de exemplo e permitido, porque o campo e apagado em seguida e o formulario nunca e enviado.

const MODULO = 'Perfil';
const PAPEIS: Roteiro['papeis'] = ['ADMIN', 'FINANCEIRO', 'BACKOFFICE', 'CLIENTE'];

const SENHA_DE_EXEMPLO = 'Sep@Demo2026!tour';

const MENU_PERFIL = {
  rota: '/app/profile',
  titulo: 'Menu Meu perfil',
  texto: 'No menu lateral, em Conta, fica o Meu perfil. Ele aparece para todos os papéis.',
  aguardarAlvo: '.profile-hero',
};

const MENU_SENHA = {
  rota: '/app/profile/change-password',
  titulo: 'Submenu Alterar senha',
  texto: 'Dentro do Meu perfil, o submenu Alterar senha abre a troca de senha.',
  aguardarAlvo: '.password-form-card',
};

const MENU_TOTP = {
  rota: '/app/profile/setup-totp',
  titulo: 'Submenu Configurar TOTP',
  texto: 'E o submenu Configurar TOTP abre a ativação da verificação em duas etapas.',
  aguardarAlvo: '.px34-page',
};

// ============ ROTEIROS ============

const perfil: Roteiro = {
  id: 'perfil-conta',
  modulo: MODULO,
  titulo: 'Minha conta',
  icone: 'user-round',
  descricao: 'Identificação, acesso, auditoria, segurança da conta e preferências.',
  duracao: '≈ 2,5 min',
  papeis: PAPEIS,
  passos: () => [
    {
      titulo: 'Ponto de partida',
      texto:
        'Este roteiro mostra o perfil da conta. Tudo começa no Dashboard, logo depois do login.',
    },
    ...peloMenu(MENU_PERFIL),
    {
      titulo: 'Para que serve',
      texto:
        'O perfil reúne os dados da conta, o histórico de acesso e as preferências de quem está logado.',
      alvo: '.profile-heading',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Identificação',
      texto:
        'No alto, o e-mail da conta, o papel de acesso e o identificador único. O botão ao lado copia o identificador, útil para falar com o suporte.',
      alvo: '.profile-identity',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Status e ambiente',
      texto:
        'Ao lado, a situação da conta e o ambiente em que ela opera: regulado, conforme a resolução do CMN.',
      alvo: '.profile-account-status',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Identificação e acesso',
      texto:
        'Este cartão mostra o nível de acesso, o papel e os dados da sessão atual, com o aviso Agora na sessão em uso.',
      alvo: '.profile-access',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Auditoria da conta',
      texto:
        'A auditoria mostra os últimos acessos, as tentativas de login que falharam nas últimas vinte e quatro horas e o histórico. O botão Exportar baixa o relatório; aqui só apontamos onde fica.',
      alvo: '.profile-audit',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Segurança da conta',
      texto:
        'O cartão de segurança resume a senha, a verificação em duas etapas, as sessões abertas, os dispositivos autorizados e se a auditoria está ativa.',
      alvo: '.profile-security',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Informações complementares',
      texto:
        'As informações complementares mostram as preferências: idioma, fuso horário, tema, notificações, canal de comunicação e a sincronização do armazenamento.',
      alvo: '.profile-complementary',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Editar preferências',
      texto: 'O botão no alto abre a edição das preferências.',
      alvo: '.profile-outline-button',
      acao: { tipo: 'clicar' },
      aguardarAlvo: '.profile-modal',
    },
    {
      titulo: 'Preferências',
      texto:
        'A janela deixa escolher o idioma, o fuso horário, o tema, o canal de comunicação e se as notificações ficam ativas. Aqui só olhamos, sem salvar.',
      alvo: '.profile-modal',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Cancelar',
      texto: 'Cancelar fecha a janela sem mudar nada.',
      alvo: { css: '.profile-modal button', texto: 'Cancelar' },
      acao: { tipo: 'clicar' },
    },
  ],
};

const senha: Roteiro = {
  id: 'perfil-senha',
  modulo: MODULO,
  titulo: 'Alterar a senha',
  icone: 'key-round',
  descricao: 'O formulário, a força da senha e os requisitos, sem salvar a troca.',
  duracao: '≈ 2 min',
  papeis: PAPEIS,
  passos: () => [
    {
      titulo: 'Alterar a senha',
      texto:
        'Este roteiro mostra a troca de senha. A senha da conta não é alterada: o tour só demonstra o formulário.',
    },
    ...peloMenu(MENU_PERFIL, MENU_SENHA),
    {
      titulo: 'Recomendação',
      texto:
        'O aviso no alto recomenda uma frase com quatro ou mais palavras: é mais fácil de lembrar e mais difícil de adivinhar.',
      alvo: '.password-tip-banner',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Senha atual',
      texto: 'O primeiro campo pede a senha atual. É a prova de que quem troca é o dono da conta.',
      alvo: '.password-field:has(#passwordAtual)',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Nova senha',
      texto:
        'No segundo, a nova senha. Vamos digitar uma senha de exemplo, só para ver a força dela subir. Ela não será salva.',
      alvo: '#novaSenha',
      acao: { tipo: 'digitar', texto: () => SENHA_DE_EXEMPLO },
    },
    {
      titulo: 'Força da senha',
      texto:
        'O anel mostra a força da senha enquanto ela é digitada, e os segmentos abaixo se acendem conforme ela melhora.',
      alvo: '.strength-card',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Requisitos da senha',
      texto:
        'A lista de requisitos marca, um a um, o que a senha já cumpre. O botão de salvar só libera quando todos estão cumpridos.',
      alvo: '.requirements-card',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Mostrar a senha',
      texto: 'O olho no campo mostra o que foi digitado, para conferir antes de salvar.',
      alvo: '.password-field:has(#novaSenha) button',
      acao: { tipo: 'clicar' },
    },
    {
      titulo: 'Ocultar de novo',
      texto: 'Um novo clique oculta a senha outra vez.',
      alvo: '.password-field:has(#novaSenha) button',
      acao: { tipo: 'clicar' },
    },
    {
      titulo: 'Confirmação',
      texto:
        'O terceiro campo pede a confirmação: a nova senha digitada de novo, para evitar erro de digitação.',
      alvo: '#confirmacaoNovaSenha',
      acao: { tipo: 'digitar', texto: () => SENHA_DE_EXEMPLO },
    },
    {
      titulo: 'Apagar os campos',
      texto: 'Agora os campos são apagados, para o formulário voltar vazio. Nada foi enviado.',
      alvo: '#novaSenha',
      acao: { tipo: 'digitar', texto: () => '' },
    },
    {
      titulo: 'Apagar a confirmação',
      texto: 'E a confirmação também.',
      alvo: '#confirmacaoNovaSenha',
      acao: { tipo: 'digitar', texto: () => '' },
    },
    {
      titulo: 'Alerta de segurança',
      texto: 'O alerta lembra que a senha é a chave das operações e nunca deve ser compartilhada.',
      alvo: '.password-warning',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Salvar nova senha',
      texto:
        'O botão Salvar nova senha grava a troca e pede a segunda confirmação se a conta tiver TOTP. Por ser uma operação sobre a credencial, o tour não clica nele.',
      alvo: '.password-actions',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Última alteração',
      texto: 'Por fim, o cartão mostra quando a senha foi trocada pela última vez.',
      alvo: '.last-change-card',
      acao: { tipo: 'observar' },
    },
  ],
};

const totp: Roteiro = {
  id: 'perfil-totp',
  modulo: MODULO,
  titulo: 'Verificação em duas etapas',
  icone: 'shield-check',
  descricao: 'Como funciona o TOTP, o QR code e o código de seis dígitos, sem ativar.',
  duracao: '≈ 2 min',
  papeis: PAPEIS,
  passos: () => [
    {
      titulo: 'Verificação em duas etapas',
      texto:
        'Este roteiro mostra a ativação do TOTP, o código de seis dígitos do aplicativo autenticador. Nada é ativado.',
    },
    ...peloMenu(MENU_PERFIL, MENU_TOTP),
    {
      titulo: 'Para que serve',
      texto:
        'Com o TOTP, além da senha, quem entra precisa do código que o aplicativo gera a cada trinta segundos. É o que protege as operações sensíveis.',
      alvo: '.px34-heading',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Conta já protegida',
      texto:
        'Esta conta já tem o TOTP ativo, então a tela só confirma. Quem ainda não tem vê o passo a passo da ativação.',
      alvo: '.px34-encerrado',
      acao: { tipo: 'observar' },
      pularSe: () => !document.querySelector('.px34-encerrado'),
    },
    {
      titulo: 'Como funciona',
      texto:
        'O cartão resume o caminho em passos: instalar um aplicativo autenticador, escanear o QR code e confirmar com um código.',
      alvo: '.px34-passos',
      acao: { tipo: 'observar' },
      pularSe: () => !document.querySelector('.px34-passos'),
    },
    {
      titulo: 'Escaneie o QR code',
      texto:
        'O QR code é lido pelo aplicativo autenticador. Quem não puder escanear copia a chave secreta, logo abaixo, e digita no aplicativo.',
      alvo: '.px34-qr-lado',
      acao: { tipo: 'observar' },
      pularSe: () => !document.querySelector('.px34-qr-lado'),
    },
    {
      titulo: 'Código de seis dígitos',
      texto:
        'Depois de escanear, o aplicativo mostra um código de seis dígitos. Ele é digitado aqui para confirmar. O tour não digita nenhum código, para não ativar a verificação desta conta.',
      alvo: '.px34-codigo-lado',
      acao: { tipo: 'observar' },
      pularSe: () => !document.querySelector('.px34-codigo-lado'),
    },
    {
      titulo: 'Dicas e recomendações',
      texto:
        'As dicas finais orientam a guardar os códigos de backup, a usar um aplicativo confiável e a não compartilhar o QR code.',
      alvo: '.px34-dicas',
      acao: { tipo: 'observar' },
      pularSe: () => !document.querySelector('.px34-dicas'),
    },
  ],
};

const completo: Roteiro = {
  id: 'perfil-completo',
  modulo: MODULO,
  titulo: 'Módulo completo',
  icone: 'list-checks',
  descricao: 'Os três roteiros em sequência: conta, senha e verificação em duas etapas.',
  duracao: '≈ 6 min',
  papeis: PAPEIS,
  passos: (ctx) => {
    const sem = (passos: PassoRoteiro[]): PassoRoteiro[] => passos.slice(1);
    return [...perfil.passos(ctx), ...sem(senha.passos(ctx)), ...sem(totp.passos(ctx))];
  },
};

export const ROTEIROS_PERFIL: Roteiro[] = [completo, perfil, senha, totp];
