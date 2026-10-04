import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { UsuarioResponse } from '../api/api.models';
import { AuthService } from '../auth/auth.service';
import { LUCIDE_ICONS } from '../icons/lucide-icons';
import { MODULOS_TOUR, ROTEIROS } from './roteiros';
import { peloMenu, rotaExata } from './roteiros/passos-comuns';
import { TourService, criarArquivoDemo, encontrar, escolherOpcao } from './tour.service';

function usuario(role: UsuarioResponse['role'], mfaHabilitado: boolean): UsuarioResponse {
  return {
    id: 'u-1',
    username: 'operador@empresa.com',
    role,
    precisaRedefinirSenha: false,
    mfaHabilitado,
    dataCriacao: '2026-04-24T18:30:00-03:00',
    dataModificacao: '2026-04-24T18:30:00-03:00',
    criadoPor: 'system',
    modificadoPor: 'system',
  };
}

/** 'credit-card' -> 'CreditCard': a chave com que o icone esta registrado. */
function registrado(nome: string): boolean {
  const pascal = nome
    .split('-')
    .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1))
    .join('');
  return pascal in LUCIDE_ICONS;
}

describe('TourService', () => {
  let tour: TourService;
  let auth: AuthService & { currentUserState: { set: (u: UsuarioResponse | null) => void } };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: 'app/dashboard', children: [] }]), provideHttpClient()],
    });
    tour = TestBed.inject(TourService);
    auth = TestBed.inject(AuthService) as typeof auth;
  });

  afterEach(() => {
    tour.encerrar();
    document.body.innerHTML = '';
  });

  it('agrupa os roteiros por modulo e so mostra os do papel corrente', () => {
    auth.currentUserState.set(usuario('ADMIN', true));
    const grupos = tour.catalogo();
    expect(grupos.map((g) => g.modulo)).toEqual([
      'Onboarding',
      'Crédito',
      'Formalização',
      'Cobrança',
      'Pix',
      'Backoffice',
      'Usuários',
      'Parâmetros',
      'Perfil',
      'Plataforma',
    ]);
    const usuarios = grupos.find((g) => g.modulo === 'Usuários')!;
    expect(usuarios.roteiros.map((r) => r.titulo)).toEqual([
      'Módulo completo',
      'Visão geral da lista',
      'Incluir novo usuário',
      'Editar papéis de um usuário',
      'Excluir ou suspender usuário',
    ]);

    // O backoffice alcanca Onboarding, Credito e Formalizacao, mas nao a Administracao.
    auth.currentUserState.set(usuario('BACKOFFICE', true));
    expect(tour.catalogo().map((g) => g.modulo)).toEqual([
      'Onboarding',
      'Crédito',
      'Formalização',
      'Cobrança',
      'Pix',
      'Backoffice',
      'Perfil',
      'Plataforma',
    ]);

    // O cliente so alcanca a jornada da Credora; nenhum dos modulos operacionais.
    auth.currentUserState.set(usuario('CLIENTE', true));
    expect(tour.catalogo().map((g) => g.modulo)).toEqual(['Credora', 'Perfil', 'Plataforma']);
  });

  it('em Parametros, so alterar (e o modulo completo) pede TOTP; catalogo e consulta rodam sem', () => {
    auth.currentUserState.set(usuario('ADMIN', false));
    const grupo = tour.catalogo().find((g) => g.modulo === 'Parâmetros')!;
    const motivo = (titulo: string) =>
      tour.impedimento(grupo.roteiros.find((r) => r.titulo === titulo)!);

    expect(grupo.roteiros.map((r) => r.titulo)).toEqual([
      'Módulo completo',
      'Visão geral do catálogo',
      'Consultar um parâmetro',
      'Alterar um parâmetro',
    ]);
    expect(motivo('Visão geral do catálogo')).toBeNull();
    expect(motivo('Consultar um parâmetro')).toBeNull();
    expect(motivo('Alterar um parâmetro')).toContain('TOTP');
    expect(motivo('Módulo completo')).toContain('TOTP');
  });

  it('em Formalizacao, so o aceite (e o modulo completo) pede TOTP; ler o contrato roda sem', () => {
    auth.currentUserState.set(usuario('FINANCEIRO', false));
    const grupo = tour.catalogo().find((g) => g.modulo === 'Formalização')!;
    const motivo = (titulo: string) =>
      tour.impedimento(grupo.roteiros.find((r) => r.titulo === titulo)!);

    expect(grupo.roteiros.map((r) => r.titulo)).toEqual([
      'Módulo completo',
      'Visão geral da formalização',
      'Ler um contrato',
      'Aceitar o contrato',
    ]);
    expect(motivo('Visão geral da formalização')).toBeNull();
    expect(motivo('Ler um contrato')).toBeNull();
    expect(motivo('Aceitar o contrato')).toContain('TOTP');
    expect(motivo('Módulo completo')).toContain('TOTP');
  });

  it('em Cobranca, o backoffice so ve a visao geral e a agenda do contrato; so a renegociacao pede TOTP', () => {
    auth.currentUserState.set(usuario('BACKOFFICE', false));
    const titulos = (papel: Parameters<typeof usuario>[0], mfa: boolean) => {
      auth.currentUserState.set(usuario(papel, mfa));
      return tour
        .catalogo()
        .find((g) => g.modulo === 'Cobrança')!
        .roteiros.map((r) => r.titulo);
    };
    expect(titulos('BACKOFFICE', false)).toEqual([
      'Visão geral da cobrança',
      'Agenda de um contrato',
    ]);

    auth.currentUserState.set(usuario('FINANCEIRO', false));
    const grupo = tour.catalogo().find((g) => g.modulo === 'Cobrança')!;
    const motivo = (titulo: string) =>
      tour.impedimento(grupo.roteiros.find((r) => r.titulo === titulo)!);
    expect(grupo.roteiros).toHaveLength(7);
    expect(motivo('Atender uma parcela')).toBeNull();
    expect(motivo('Inadimplência')).toBeNull();
    expect(motivo('Propor uma renegociação')).toContain('TOTP');
    expect(motivo('Módulo completo')).toContain('TOTP');
  });

  it('em Pix, o backoffice consulta mas nao solicita desembolso; so a solicitacao pede TOTP', () => {
    auth.currentUserState.set(usuario('BACKOFFICE', false));
    const doBackoffice = tour
      .catalogo()
      .find((g) => g.modulo === 'Pix')!
      .roteiros.map((r) => r.titulo);
    expect(doBackoffice).toEqual([
      'Visão geral do Pix',
      'Consultar um desembolso',
      'Consultar um recebimento',
      'Divergências',
    ]);

    auth.currentUserState.set(usuario('FINANCEIRO', false));
    const grupo = tour.catalogo().find((g) => g.modulo === 'Pix')!;
    const motivo = (titulo: string) =>
      tour.impedimento(grupo.roteiros.find((r) => r.titulo === titulo)!);
    expect(grupo.roteiros).toHaveLength(6);
    expect(motivo('Consultar um desembolso')).toBeNull();
    expect(motivo('Solicitar um desembolso')).toContain('TOTP');
    expect(motivo('Módulo completo')).toContain('TOTP');
  });

  it('em Backoffice, ler roda sem TOTP; tratar e reprocessar (e o completo) pedem TOTP', () => {
    auth.currentUserState.set(usuario('BACKOFFICE', false));
    const grupo = tour.catalogo().find((g) => g.modulo === 'Backoffice')!;
    const motivo = (titulo: string) =>
      tour.impedimento(grupo.roteiros.find((r) => r.titulo === titulo)!);

    expect(grupo.roteiros.map((r) => r.titulo)).toEqual([
      'Módulo completo',
      'Dashboard operacional',
      'Indicadores da plataforma',
      'Fila operacional',
      'Tratar uma ocorrência',
      'Histórico de reprocessos',
      'Disparar um reprocesso',
    ]);
    expect(motivo('Dashboard operacional')).toBeNull();
    expect(motivo('Fila operacional')).toBeNull();
    expect(motivo('Histórico de reprocessos')).toBeNull();
    expect(motivo('Tratar uma ocorrência')).toContain('TOTP');
    expect(motivo('Disparar um reprocesso')).toContain('TOTP');
    expect(motivo('Módulo completo')).toContain('TOTP');
  });

  it('a entidade do reprocesso muda a cada execucao e cabe no formato de identificador', () => {
    const roteiro = ROTEIROS.find((r) => r.id === 'backoffice-reprocessar')!;
    const base = {
      demo: true,
      papel: 'ADMIN' as const,
      mfa: true,
      dados: {} as Record<string, string>,
    };
    const texto = (carimbo: string) => {
      const ctx = { ...base, carimbo };
      const passo = roteiro.passos(ctx).find((p) => p.titulo === 'Entidade')!;
      if (passo.acao?.tipo !== 'digitar') throw new Error('passo deveria digitar');
      return passo.acao.texto(ctx);
    };
    expect(texto('123456')).toMatch(/^e0000000-0000-4000-8000-[0-9]{12}$/);
    expect(texto('123456')).not.toBe(texto('654321'));
  });

  it('em Credora, cada roteiro diz com qual conta de exemplo roda', () => {
    auth.currentUserState.set({ ...usuario('CLIENTE', false), username: 'credora@empresa.com' });
    const grupo = tour.catalogo().find((g) => g.modulo === 'Credora')!;
    expect(grupo.roteiros.map((r) => r.titulo)).toEqual([
      'Módulo completo',
      'Visão geral da jornada',
      'Cadastrar a empresa credora',
      'Perfil e elegibilidade',
      'Oportunidades e interesse',
      'Carteira de operações',
    ]);
    const motivo = (titulo: string) =>
      tour.impedimento(grupo.roteiros.find((r) => r.titulo === titulo)!);
    // A conta que ja tem credora roda o perfil, e o cadastro explica que e de outra conta.
    expect(motivo('Perfil e elegibilidade')).toBeNull();
    expect(motivo('Cadastrar a empresa credora')).toContain('credora-novo@empresa.com');

    // A conta errada recebe o motivo e o caminho.
    const roteiro = ROTEIROS.find((r) => r.id === 'credora-carteira')!;
    const ctx = {
      demo: true,
      papel: 'CLIENTE' as const,
      mfa: false,
      usuario: 'credora-novo@empresa.com',
      carimbo: '000000',
      dados: {},
    };
    expect(roteiro.impedimento?.(ctx)).toContain('credora@empresa.com');
    expect(roteiro.impedimento?.({ ...ctx, usuario: 'credora@empresa.com' })).toBeNull();
    const cadastro = ROTEIROS.find((r) => r.id === 'credora-cadastro')!;
    expect(cadastro.impedimento?.({ ...ctx, usuario: 'credora@empresa.com' })).toContain(
      'credora-novo@empresa.com',
    );
    expect(cadastro.impedimento?.(ctx)).toBeNull();
  });

  it('em Perfil, todos os papeis veem os roteiros e nenhum exige TOTP nem grava credencial', () => {
    for (const papel of ['ADMIN', 'FINANCEIRO', 'BACKOFFICE', 'CLIENTE'] as const) {
      auth.currentUserState.set(usuario(papel, false));
      const grupo = tour.catalogo().find((g) => g.modulo === 'Perfil')!;
      expect(grupo.roteiros.map((r) => r.titulo)).toEqual([
        'Módulo completo',
        'Minha conta',
        'Alterar a senha',
        'Verificação em duas etapas',
      ]);
      expect(grupo.roteiros.every((r) => tour.impedimento(r) === null)).toBe(true);
    }
    // Trocar senha e ativar TOTP mexem na credencial: nenhum clique do modulo grava dados.
    const gravam = ROTEIROS.filter((r) => r.modulo === 'Perfil')
      .flatMap((r) =>
        r.passos({ demo: true, papel: 'ADMIN', mfa: true, carimbo: '000000', dados: {} }),
      )
      .filter((p) => p.acao?.tipo === 'clicar' && p.acao.efeito);
    expect(gravam).toEqual([]);
  });

  it('o novo valor do parametro e sempre diferente do atual, lido da tela', () => {
    auth.currentUserState.set(usuario('ADMIN', true));
    const alterar = ROTEIROS.find((r) => r.id === 'parametros-alterar')!;
    const ctx = {
      demo: true,
      papel: 'ADMIN' as const,
      mfa: true,
      carimbo: '000000',
      dados: {} as Record<string, string>,
    };
    const passo = alterar.passos(ctx).find((p) => p.titulo === 'Novo valor')!;
    if (passo.acao?.tipo !== 'digitar') throw new Error('passo deveria digitar');

    document.body.innerHTML = '<input id="novo-valor" value="24">';
    expect(passo.acao.texto(ctx)).toBe('25');
    expect(ctx.dados).toMatchObject({ antigo: '24', novo: '25' });

    // Sem o campo na tela, cai num valor padrao em vez de digitar "NaN".
    document.body.innerHTML = '';
    expect(passo.acao.texto(ctx)).toBe('25');
  });

  it('os roteiros de Credito rodam para qualquer papel do modulo, mesmo sem TOTP', () => {
    auth.currentUserState.set(usuario('FINANCEIRO', false));
    const credito = tour.catalogo().find((g) => g.modulo === 'Crédito')!;
    expect(credito.roteiros.map((r) => r.titulo)).toEqual([
      'Módulo completo',
      'Visão geral do módulo',
      'Minhas propostas',
      'Solicitar nova proposta',
      'Acompanhar uma proposta',
    ]);
    expect(credito.roteiros.map((r) => tour.impedimento(r))).toEqual([
      null,
      null,
      null,
      null,
      null,
    ]);
  });

  it('cada passo de acao tem alvo, e os de selecionar apontam opcao', () => {
    auth.currentUserState.set(usuario('ADMIN', true));
    for (const roteiro of ROTEIROS) {
      const passos = roteiro.passos({
        demo: true,
        papel: 'ADMIN',
        mfa: true,
        carimbo: '000000',
        dados: {},
      });
      expect(passos.length).toBeGreaterThan(3);
      for (const passo of passos) {
        const tipo = passo.acao?.tipo;
        if (tipo && tipo !== 'observar') {
          // Clicar, digitar e selecionar sem alvo nao teriam onde agir.
          expect(passo.alvo, `${roteiro.id} · ${passo.titulo}`).toBeTruthy();
        }
        if (passo.acao?.tipo === 'selecionar') expect(passo.acao.opcao).not.toBe('');
      }
    }
  });

  it('editar papeis pede conta com TOTP; incluir roda sem', () => {
    auth.currentUserState.set(usuario('ADMIN', false));
    const grupo = tour.catalogo().find((g) => g.modulo === 'Usuários')!;
    const porTitulo = (t: string) => grupo.roteiros.find((r) => r.titulo === t)!;

    expect(tour.impedimento(porTitulo('Editar papéis de um usuário'))).toContain('TOTP');
    expect(tour.impedimento(porTitulo('Módulo completo'))).toContain('TOTP');
    expect(tour.impedimento(porTitulo('Incluir novo usuário'))).toBeNull();
  });

  it('sem TOTP, a inclusao cria so com CLIENTE e nao passa pelo step-up', () => {
    auth.currentUserState.set(usuario('ADMIN', false));
    tour.iniciar('usuarios-incluir');
    const titulos = tour.passos().map((p) => p.titulo);
    expect(titulos).not.toContain('Papel BACKOFFICE');
    expect(titulos).not.toContain('Código do autenticador');
    expect(titulos).toContain('Usuário criado');
  });

  it('com TOTP, a inclusao marca BACKOFFICE e confirma o papel', () => {
    auth.currentUserState.set(usuario('ADMIN', true));
    tour.iniciar('usuarios-incluir');
    const titulos = tour.passos().map((p) => p.titulo);
    expect(titulos).toContain('Papel BACKOFFICE');
    expect(titulos).toContain('Código do autenticador');
    expect(tour.estado()).toBe('rodando');
  });

  it('encerrar devolve a tela sem destaque e sem roteiro', () => {
    auth.currentUserState.set(usuario('ADMIN', true));
    tour.iniciar('usuarios-visao-geral');
    tour.encerrar();
    expect(tour.ativo()).toBe(false);
    expect(tour.roteiro()).toBeNull();
    expect(document.querySelector('.sep-tour-alvo')).toBeNull();
  });

  it('encontrar casa por seletor e, quando pedido, pelo texto visivel', () => {
    document.body.innerHTML = `
      <button class="chip">ADMIN</button>
      <button class="chip">FINANCEIRO</button>
    `;
    // jsdom nao faz layout: sem isto nenhum elemento teria caixa e todos pareceriam ocultos.
    for (const el of Array.from(document.querySelectorAll('button'))) {
      el.getClientRects = () => [{} as DOMRect] as unknown as DOMRectList;
    }

    expect(encontrar('.chip')?.textContent).toBe('ADMIN');
    expect(encontrar({ css: '.chip', texto: 'financeiro' })?.textContent).toBe('FINANCEIRO');
    expect(encontrar({ css: '.chip', texto: 'CLIENTE' })).toBeNull();
  });

  it('escolherOpcao acha a opcao pelo texto, sem acento nem caixa, ou pelo value', () => {
    document.body.innerHTML = `
      <select>
        <option value="">Selecione</option>
        <option value="2: 12">12</option>
        <option value="CAPITAL">Capital de giro</option>
        <option value="ANALISE">Em análise</option>
      </select>`;
    const lista = document.querySelector('select')!;

    expect(escolherOpcao(lista, '12')?.value).toBe('2: 12');
    expect(escolherOpcao(lista, 'capital DE giro')?.value).toBe('CAPITAL');
    expect(escolherOpcao(lista, 'em analise')?.value).toBe('ANALISE');
    expect(escolherOpcao(lista, 'ANALISE')?.textContent).toBe('Em análise');
    expect(escolherOpcao(lista, 'Inexistente')).toBeNull();
  });

  it('rotaExata aceita query string e recusa rotas irmas', () => {
    const padrao = rotaExata('/app/credito/propostas');
    expect(padrao.test('/app/credito/propostas')).toBe(true);
    expect(padrao.test('/app/credito/propostas?status=APROVADA')).toBe(true);
    expect(padrao.test('/app/credito/propostas/nova')).toBe(false);
  });

  it('peloMenu abre o menu, clica no grupo e depois no submenu', () => {
    const passos = peloMenu(
      { rota: '/app/pix', titulo: 'Menu Pix', texto: 'a' },
      { rota: '/app/pix/desembolsos', titulo: 'Submenu', texto: 'b' },
    );
    expect(passos.map((p) => p.titulo)).toEqual(['Abrir o menu', 'Menu Pix', 'Submenu']);
    expect(passos[1].alvo).toBe('a.op-nav-link[href="/app/pix"]');
    expect(passos[2].alvo).toBe('a.op-subnav-link[href="/app/pix/desembolsos"]');
    // O menu so e aberto quando esta recolhido.
    expect(passos[0].pularSe?.({} as never)).toBe(true);
  });

  it('todo modulo e todo roteiro tem icone registrado, e os itens de um modulo nao repetem desenho', () => {
    const modulos = [...new Set(ROTEIROS.map((r) => r.modulo))];

    for (const modulo of modulos) {
      const marca = MODULOS_TOUR[modulo];
      expect(marca, `modulo "${modulo}" sem icone e cor em MODULOS_TOUR`).toBeTruthy();
      expect(registrado(marca.icone), `${modulo}: icone "${marca.icone}" nao registrado`).toBe(
        true,
      );
      expect(marca.tom).toMatch(/^var\(--sep-/);

      const itens = ROTEIROS.filter((r) => r.modulo === modulo);
      for (const item of itens) {
        expect(registrado(item.icone), `${item.id}: icone "${item.icone}" nao registrado`).toBe(
          true,
        );
      }
      // Dois itens do mesmo modulo com o mesmo desenho obrigam a ler o titulo para distingui-los.
      const icones = itens.map((r) => r.icone);
      expect(new Set(icones).size, `${modulo}: icones repetidos ${icones.join(', ')}`).toBe(
        icones.length,
      );
    }

    // Cada modulo tem o proprio icone e a propria cor no painel.
    expect(new Set(modulos.map((m) => MODULOS_TOUR[m].icone)).size).toBe(modulos.length);
    expect(new Set(modulos.map((m) => MODULOS_TOUR[m].tom)).size).toBe(modulos.length);
  });

  it('o catalogo entrega icone e cor de cada grupo', () => {
    auth.currentUserState.set(usuario('ADMIN', true));
    const grupos = tour.catalogo();
    expect(grupos.map((g) => g.icone)).toEqual([
      'user-plus',
      'credit-card',
      'file-check',
      'banknote',
      'qr-code',
      'briefcase',
      'users',
      'settings',
      'user-round',
      'layout-dashboard',
    ]);
    expect(grupos.every((g) => g.tom.startsWith('var(--sep-'))).toBe(true);
  });

  it('os roteiros de Onboarding rodam sem TOTP e anexam so arquivo de demonstracao', () => {
    auth.currentUserState.set(usuario('FINANCEIRO', false));
    const onboarding = tour.catalogo().find((g) => g.modulo === 'Onboarding')!;
    expect(onboarding.roteiros.map((r) => r.titulo)).toEqual([
      'Módulo completo',
      'Visão geral do módulo',
      'Cadastro de pessoa física (KYC)',
      'Cadastro de empresa (KYB)',
    ]);
    expect(onboarding.roteiros.map((r) => tour.impedimento(r))).toEqual([null, null, null, null]);

    const ctx = {
      demo: true,
      papel: 'FINANCEIRO' as const,
      mfa: false,
      carimbo: '000000',
      dados: {},
    };
    const anexos = ROTEIROS.filter((r) => r.modulo === 'Onboarding')
      .flatMap((r) => r.passos(ctx))
      .filter((p) => p.acao?.tipo === 'anexar');
    expect(anexos.length).toBeGreaterThan(0);
    for (const passo of anexos) {
      if (passo.acao?.tipo !== 'anexar') continue;
      // So PDF de demonstracao, ou o executavel que existe para a tela recusar. Nunca algo real.
      expect([
        'documento.exe',
        'rg-demonstracao.pdf',
        'contrato-social-demonstracao.pdf',
      ]).toContain(passo.acao.nome);
    }
    // Todo envio e um clique com efeito: fora do ambiente de demonstracao o roteiro para antes.
    const envios = ROTEIROS.filter((r) => r.modulo === 'Onboarding')
      .flatMap((r) => r.passos(ctx))
      .filter((p) => p.titulo === 'Enviar documento' || p.titulo === 'Enviar para verificação');
    expect(envios.length).toBeGreaterThan(0);
    for (const passo of envios) {
      expect(passo.acao).toMatchObject({ tipo: 'clicar', efeito: true });
    }
  });

  describe('tours do site institucional', () => {
    it('ficam fora do catalogo do sistema e entram no catalogo publico, sem depender de login', () => {
      auth.currentUserState.set(usuario('ADMIN', true));
      expect(tour.catalogo().some((g) => g.modulo === 'Site institucional')).toBe(false);

      const publico = tour.catalogoPublico();
      expect(publico.length).toBe(1);
      expect(publico[0].modulo).toBe('Site institucional');
      expect(publico[0].roteiros.map((r) => r.titulo)).toEqual([
        'Módulo completo',
        'Página inicial',
        'Crédito PJ',
        'Segurança',
        'Como funciona',
        'Sobre o SEP',
        'Contato',
        'Política de privacidade',
        'Termos de uso',
      ]);
      // Sem sessao: o catalogo publico nao muda, e nenhum roteiro tem impedimento.
      auth.currentUserState.set(null);
      expect(tour.catalogoPublico()[0].roteiros.every((r) => !tour.impedimento(r))).toBe(true);
    });

    it('partem da pagina inicial e so apontam elementos, sem gravar nada', () => {
      const ctx = { demo: true, papel: null, mfa: false, carimbo: '000000', dados: {} };
      for (const roteiro of ROTEIROS.filter((r) => r.area === 'publica')) {
        expect(roteiro.rotaInicial, roteiro.id).toBe('/');
        const passos = roteiro.passos(ctx);
        // Nenhum passo grava: o formulario de contato e so mostrado, e nada e digitado.
        expect(
          passos.some(
            (p) => p.acao?.tipo === 'digitar' || (p.acao?.tipo === 'clicar' && p.acao.efeito),
          ),
          roteiro.id,
        ).toBe(false);
        // Todo passo que age tem alvo, e os de navegacao esperam a pagina chegar.
        for (const passo of passos.filter((p) => p.acao?.tipo === 'clicar')) {
          expect(passo.alvo, `${roteiro.id}: ${passo.titulo}`).toBeTruthy();
          expect(passo.aguardarRota, `${roteiro.id}: ${passo.titulo}`).toBeTruthy();
        }
      }
    });

    it('o roteiro de contato nao aciona o envio do formulario', () => {
      const ctx = { demo: true, papel: null, mfa: false, carimbo: '000000', dados: {} };
      const passos = ROTEIROS.find((r) => r.id === 'publico-contato')!.passos(ctx);
      const envio = passos.find((p) => p.titulo === 'Enviar mensagem')!;
      expect(envio.acao).toEqual({ tipo: 'observar' });
    });
  });

  describe('tours da plataforma', () => {
    it('servem a todos os papeis e nao exigem TOTP', () => {
      for (const papel of ['ADMIN', 'FINANCEIRO', 'BACKOFFICE', 'CLIENTE'] as const) {
        auth.currentUserState.set(usuario(papel, false));
        const grupo = tour.catalogo().find((g) => g.modulo === 'Plataforma')!;
        expect(
          grupo.roteiros.map((r) => r.titulo),
          papel,
        ).toEqual(['Módulo completo', 'Menu lateral', 'Barra superior', 'Conta e sessão']);
        expect(
          grupo.roteiros.every((r) => !tour.impedimento(r)),
          papel,
        ).toBe(true);
      }
    });

    it('mostra a troca de usuario e a saida, mas nao aciona nenhuma das duas', () => {
      const ctx = { demo: true, papel: 'ADMIN' as const, mfa: true, carimbo: '000000', dados: {} };
      const passos = ROTEIROS.find((r) => r.id === 'plataforma-conta')!.passos(ctx);
      for (const titulo of ['Trocar de usuário', 'Sair da conta']) {
        const passo = passos.find((p) => p.titulo === titulo)!;
        expect(passo.acao, titulo).toEqual({ tipo: 'observar' });
      }
    });

    it('o menu recolhe e expande de volta, sem pular o passo de quem ja o encontrou recolhido', () => {
      const ctx = { demo: true, papel: 'ADMIN' as const, mfa: true, carimbo: '000000', dados: {} };
      const passos = ROTEIROS.find((r) => r.id === 'plataforma-menu')!.passos(ctx);
      const recolher = passos.find((p) => p.titulo === 'Recolher o menu')!;
      const expandir = passos.find((p) => p.titulo === 'Expandir o menu')!;
      expect(recolher.acao).toEqual({ tipo: 'clicar' });
      expect(expandir.acao).toEqual({ tipo: 'clicar' });

      document.body.innerHTML = '<div class="op-sidebar-colapsada"></div>';
      expect(recolher.pularSe?.(ctx)).toBe(true);
      expect(expandir.pularSe?.(ctx)).toBe(false);
      document.body.innerHTML = '';
      expect(recolher.pularSe?.(ctx)).toBe(false);
      expect(expandir.pularSe?.(ctx)).toBe(true);
    });
  });

  describe('submodulos do modulo completo', () => {
    const ctx = { demo: true, papel: 'ADMIN' as const, mfa: true, carimbo: '000000', dados: {} };

    it('todo "Modulo completo" marca cada passo com o roteiro a que pertence, em ordem', () => {
      const completos = ROTEIROS.filter((r) => r.titulo === 'Módulo completo');
      expect(completos.length).toBe(Object.keys(MODULOS_TOUR).length);
      for (const completo of completos) {
        const passos = completo.passos(ctx);
        expect(
          passos.every((p) => p.secao),
          `${completo.id}: passo sem secao`,
        ).toBe(true);
        const nomes = passos.map((p) => p.secao as string);
        const unicas = [...new Set(nomes)];
        // Cada secao e uma faixa continua: nenhuma reaparece depois de outra.
        expect(unicas.length, completo.id).toBe(
          nomes.filter((n, i) => i === 0 || n !== nomes[i - 1]).length,
        );
        expect(unicas.length, completo.id).toBeGreaterThan(1);
      }
    });

    it('roteiros avulsos nao tem secao', () => {
      const avulso = ROTEIROS.find((r) => r.id === 'backoffice-fila')!;
      expect(avulso.passos(ctx).some((p) => p.secao)).toBe(false);
    });

    it('lista as secoes com a faixa de passos de cada uma e a situacao pelo passo atual', () => {
      auth.currentUserState.set(usuario('ADMIN', true));
      tour.iniciar('backoffice-completo');
      const secoes = tour.secoes();
      expect(secoes.length).toBe(6);
      expect(secoes[0].inicio).toBe(0);
      for (let i = 1; i < secoes.length; i += 1) {
        expect(secoes[i].inicio).toBe(secoes[i - 1].fim + 1);
      }
      expect(secoes[secoes.length - 1].fim).toBe(tour.passos().length - 1);

      tour.indice.set(secoes[2].inicio + 1);
      expect(tour.situacaoDasSecoes()).toEqual([
        'feita',
        'feita',
        'atual',
        'pendente',
        'pendente',
        'pendente',
      ]);
    });

    it('irParaSecao recomeca do primeiro passo da secao e volta a rodar', () => {
      auth.currentUserState.set(usuario('ADMIN', true));
      tour.iniciar('backoffice-completo');
      tour.pausar();
      tour.indice.set(tour.secoes()[4].inicio + 3);
      tour.irParaSecao(1);
      expect(tour.indice()).toBe(tour.secoes()[1].inicio);
      expect(tour.estado()).toBe('rodando');
    });

    it('voltar sem historico fica no passo atual; com historico, recua pelo relogio do tour', () => {
      auth.currentUserState.set(usuario('ADMIN', true));
      tour.iniciar('backoffice-completo');
      tour.pausar();
      const interno = tour as unknown as { marcas: number[]; acumulado: number };
      // Passos 0..5 comecaram a cada 10 s de tour; o relogio esta em 55 s, no passo 5.
      interno.marcas = [0, 10_000, 20_000, 30_000, 40_000, 50_000];
      interno.acumulado = 55_000;
      tour.indice.set(5);
      tour.voltar();
      // 55 s - 15 s = 40 s: o passo que estava no ar era o 4.
      expect(tour.indice()).toBe(4);
      expect(tour.estado()).toBe('rodando');
    });
  });

  it('criarArquivoDemo gera arquivo pequeno com o nome e o tipo pedidos', () => {
    const arquivo = criarArquivoDemo('rg-demonstracao.pdf', 'application/pdf');
    expect(arquivo.name).toBe('rg-demonstracao.pdf');
    expect(arquivo.type).toBe('application/pdf');
    expect(arquivo.size).toBeGreaterThan(0);
    expect(arquivo.size).toBeLessThan(1024);
  });
});
