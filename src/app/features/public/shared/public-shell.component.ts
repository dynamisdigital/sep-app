/**
 * SEP — Frontend
 *
 * Frontend Development:
 * Daniel Möllmann
 *
 * Angular • TypeScript • SCSS
 * 2026
 */

import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, ViewEncapsulation } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter, map } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';

import { LarguraTelaDirective } from '../../../core/layout/largura-tela.directive';
import { ThemeService } from '../../../core/theme/theme.service';
import { AcoesPublicasComponent } from '../../../shared/acoes-publicas/acoes-publicas.component';
import {
  AREA_DO_INVESTIDOR,
  AVISO_ANTIFRAUDE,
  AVISO_REGULATORIO,
  NAV_RODAPE,
  NAV_SITE,
} from './site-navegacao';

/**
 * Cabeçalho e rodapé do site institucional, compartilhados por todas as páginas públicas. Antes o
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

  private readonly router = inject(Router);
  private readonly location = inject(Location);

  /** A seta de voltar aparece em toda página pública, menos na inicial. */
  protected readonly naInicial = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => this.router.url.split(/[?#]/)[0] === '/'),
    ),
    { initialValue: this.router.url.split(/[?#]/)[0] === '/' },
  );

  /** Volta uma tela; quem chegou direto pelo link (sem tela anterior no app) vai para a página inicial. */
  protected voltar(): void {
    const navegouNoApp = (history.state?.navigationId ?? 1) > 1;
    if (navegouNoApp) this.location.back();
    else void this.router.navigateByUrl('/');
  }

  protected readonly navegacao = NAV_SITE;
  protected readonly institucionais = NAV_RODAPE;
  protected readonly areaDoInvestidor = AREA_DO_INVESTIDOR;
  protected readonly avisoAntifraude = AVISO_ANTIFRAUDE;
  protected readonly avisoRegulatorio = AVISO_REGULATORIO;

  protected readonly ano = new Date().getFullYear();
}
