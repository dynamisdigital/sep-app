import { EtapaMenu } from './passos-comuns';

// Etapas de menu que mais de um roteiro usa. O texto vive aqui para dois modulos do mesmo grupo
// (Usuarios e Parametros) nao contarem a mesma coisa com palavras diferentes.

/** Grupo "Administracao" do menu lateral, so para o papel ADMIN. */
export const MENU_ADMINISTRACAO: EtapaMenu = {
  rota: '/app/admin',
  titulo: 'Menu Administração',
  texto: 'No menu lateral, em Conta, fica a Administração. Ela só aparece para o papel ADMIN.',
};
