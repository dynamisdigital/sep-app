/**
 * SEP — Frontend
 *
 * Frontend Development:
 * Daniel Möllmann
 *
 * Angular • TypeScript • SCSS
 * 2026
 */

import { ChangeDetectionStrategy, Component, inject, ViewEncapsulation } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { LarguraTelaDirective } from '../../../core/layout/largura-tela.directive';
import { ThemeService } from '../../../core/theme/theme.service';
import { AcoesPublicasComponent } from '../../../shared/acoes-publicas/acoes-publicas.component';

/** Item do menu institucional. As rotas existem todas; nenhuma é âncora. */
interface SiteNavItem {
  label: string;
  route: string;
}

/**
 * Cabeçalho e rodapé do site institucional, compartilhados pelas sete páginas públicas. Antes o
 * menu da landing apontava para âncoras da própria página, e "Privacidade" e "Termos de uso" iam
 * para `/` sem fragmento — dois links que não levavam a lugar nenhum.
 */
@Component({
  selector: 'sep-public-shell',
  imports: [
    RouterLink,
    RouterLinkActive,
    LucideAngularModule,
    LarguraTelaDirective,
    AcoesPublicasComponent,
  ],
  templateUrl: './public-shell.component.html',
  styleUrl: './public-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class PublicShellComponent {
  protected readonly assetBase = '/image/sep_mockup_01_assets';

  private readonly tema = inject(ThemeService);

  /** O botao do cabecalho troca o tema das telas publicas; o escuro e o padrao do projeto. */
  protected readonly temaEscuro = this.tema.isDark;

  protected alternarTema(): void {
    this.tema.toggle();
  }

  protected readonly navegacao: SiteNavItem[] = [
    { label: 'Crédito PJ', route: '/credito-pj' },
    { label: 'Segurança', route: '/seguranca' },
    { label: 'Como funciona', route: '/como-funciona' },
    { label: 'Sobre o SEP', route: '/sobre-o-sep' },
    { label: 'Contato', route: '/contato' },
  ];

  protected readonly institucionais: SiteNavItem[] = [
    { label: 'Sobre o SEP', route: '/sobre-o-sep' },
    { label: 'Segurança', route: '/seguranca' },
    { label: 'Política de privacidade', route: '/politica-de-privacidade' },
    { label: 'Termos de uso', route: '/termos-de-uso' },
    { label: 'Contato', route: '/contato' },
  ];

  protected readonly ano = new Date().getFullYear();
}
