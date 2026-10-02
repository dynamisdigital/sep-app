import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { UsuarioRole } from '../../../core/api/api.models';
import { AuthService } from '../../../core/auth/auth.service';
import { OperationalShellComponent } from '../../../layout/operational-shell/operational-shell.component';
import { SepLogoComponent } from '../../../shared/arte/sep-logo.component';

type DashboardTone = 'blue' | 'green' | 'purple' | 'amber' | 'red';

interface DashboardAtalho {
  label: string;
  description: string;
  route: string;
  icon: string;
  tone: DashboardTone;
  roles?: UsuarioRole[];
}

// Porta de entrada da area autenticada. Os atalhos sao as jornadas que existem de fato, filtradas
// pelo papel — a mesma regra do menu do shell, para a tela nunca oferecer um caminho que o usuario
// nao pode percorrer.
//
// Tela sem arte de designer: construida no padrao visual do tema. A referencia em `image/mockups`
// e captura da implementacao.
@Component({
  selector: 'sep-dashboard',
  imports: [SepLogoComponent, RouterLink, LucideAngularModule, OperationalShellComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  private readonly auth = inject(AuthService);

  protected readonly currentUser = this.auth.currentUser;

  // Os atalhos espelham os guards das rotas: oferecer no painel um modulo que o roleGuard
  // recusaria em seguida so levaria o operador ao /access-denied.
  private readonly todasJornadas: DashboardAtalho[] = [
    {
      label: 'Onboarding',
      description: 'KYC e KYB de pessoas e empresas.',
      route: '/app/onboarding',
      icon: 'shield',
      tone: 'green',
      roles: ['BACKOFFICE', 'FINANCEIRO', 'ADMIN'],
    },
    {
      label: 'Crédito',
      description: 'Propostas, parecer e decisão.',
      route: '/app/credito',
      icon: 'credit-card',
      tone: 'blue',
      roles: ['BACKOFFICE', 'FINANCEIRO', 'ADMIN'],
    },
    {
      label: 'Formalização',
      description: 'Aceite e assinatura digital do contrato.',
      route: '/app/formalizacao',
      icon: 'file-text',
      tone: 'purple',
      roles: ['BACKOFFICE', 'FINANCEIRO', 'ADMIN'],
    },
    {
      label: 'Cobrança',
      description: 'Agenda, parcelas e inadimplência.',
      route: '/app/cobranca',
      icon: 'banknote',
      tone: 'amber',
      roles: ['BACKOFFICE', 'FINANCEIRO', 'ADMIN'],
    },
    {
      label: 'Credora',
      description: 'Oportunidades e carteira financiada.',
      route: '/app/credora',
      icon: 'briefcase',
      tone: 'green',
      roles: ['CLIENTE'],
    },
  ];

  private readonly todasOperacoes: DashboardAtalho[] = [
    {
      label: 'Backoffice',
      description: 'Fila operacional e reprocessos.',
      route: '/app/backoffice',
      icon: 'settings',
      tone: 'blue',
      roles: ['BACKOFFICE', 'FINANCEIRO', 'ADMIN'],
    },
    {
      label: 'Pix',
      description: 'Desembolsos, recebimentos e divergências.',
      route: '/app/pix',
      icon: 'wallet',
      tone: 'purple',
      roles: ['FINANCEIRO', 'ADMIN', 'BACKOFFICE'],
    },
    {
      label: 'Administração',
      description: 'Usuários, papéis e parâmetros.',
      route: '/app/admin',
      icon: 'shield-check',
      tone: 'amber',
      roles: ['ADMIN'],
    },
  ];

  private readonly todasConta: DashboardAtalho[] = [
    {
      label: 'Meu perfil',
      description: 'Dados de cadastro, MFA e auditoria.',
      route: '/app/profile',
      icon: 'user-check',
      tone: 'blue',
    },
    {
      label: 'Alterar senha',
      description: 'Atualize sua senha de acesso.',
      route: '/app/profile/change-password',
      icon: 'key-round',
      tone: 'green',
    },
  ];

  private visivel(atalho: DashboardAtalho): boolean {
    const user = this.currentUser();
    if (!atalho.roles) return true;
    return user != null && atalho.roles.includes(user.role);
  }

  protected readonly jornadas = computed(() => this.todasJornadas.filter((a) => this.visivel(a)));
  protected readonly operacoes = computed(() => this.todasOperacoes.filter((a) => this.visivel(a)));
  protected readonly conta = this.todasConta;

  // Assets do shell homologado (mockup 03), para a tela de entrada falar a mesma língua visual.
  protected readonly assetBase = '/image/sep_mockup_03_assets';

  // A marca do núcleo segue o tema como a do shell: o arquivo original tem a palavra em branco e
  // some sobre a superfície clara; a variante `_claro` recolore só a palavra.

  protected readonly saudacao = computed(() => {
    const hora = new Date().getHours();
    if (hora < 12) return 'Bom dia';
    if (hora < 18) return 'Boa tarde';
    return 'Boa noite';
  });

  protected readonly nomeUsuario = computed(() => this.currentUser()?.username ?? 'visitante');

  protected readonly totalAcessos = computed(
    () => this.jornadas().length + this.operacoes().length + this.conta.length,
  );
}
