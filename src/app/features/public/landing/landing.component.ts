import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { SepLogoComponent } from '../../../shared/arte/sep-logo.component';
import { LarguraTelaDirective } from '../../../core/layout/largura-tela.directive';
import { ThemeService } from '../../../core/theme/theme.service';
import { AcoesPublicasComponent } from '../../../shared/acoes-publicas/acoes-publicas.component';
import { FotoBannerComponent } from './foto-banner.component';
import {
  BANNERS_HERO,
  bannerAnterior,
  DURACAO_TROCA_MS,
  INTERVALO_BANNER_MS,
  proximoBanner,
} from './banners-hero';
import {
  AREA_DO_INVESTIDOR,
  AVISO_ANTIFRAUDE,
  AVISO_REGULATORIO,
  NAV_RODAPE,
  NAV_SITE,
} from '../shared/site-navegacao';

interface AssetItem {
  icon: string;
  title: string;
  description: string;
}

@Component({
  selector: 'sep-landing',
  imports: [
    LucideAngularModule,
    RouterLink,
    SepLogoComponent,
    LarguraTelaDirective,
    AcoesPublicasComponent,
    FotoBannerComponent,
  ],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingComponent {
  protected readonly assetBase = '/image/sep_mockup_01_assets';

  protected readonly navegacao = NAV_SITE;
  protected readonly institucionais = NAV_RODAPE;
  protected readonly areaDoInvestidor = AREA_DO_INVESTIDOR;
  protected readonly avisoAntifraude = AVISO_ANTIFRAUDE;
  protected readonly avisoRegulatorio = AVISO_REGULATORIO;

  private readonly tema = inject(ThemeService);

  /** O botao do topo troca o tema da tela publica; o escuro e o padrao do projeto. */
  protected readonly temaEscuro = this.tema.isDark;

  protected alternarTema(): void {
    this.tema.toggle();
  }

  // ============ BANNERS ROTATIVOS ============
  // Os três banners vêm de `BANNERS_HERO` (o primeiro é o da plataforma). A cada 15 s o
  // atual sai e o próximo entra, em ciclo sem fim. A rotação para com o mouse ou o foco sobre o banner, com
  // a aba em segundo plano, com o botão de pausa e, por acessibilidade, nunca começa para quem pediu menos
  // movimento no sistema (os pontos continuam servindo para trocar à mão).

  protected readonly banners = BANNERS_HERO;
  protected readonly totalBanners = BANNERS_HERO.length;
  protected readonly indices = Array.from({ length: BANNERS_HERO.length }, (_, i) => i);

  protected readonly ativo = signal(0);
  protected readonly saindo = signal<number | null>(null);
  /** Só depois da primeira troca o banner anima a entrada: o primeiro já tem a abertura da página. */
  protected readonly trocou = signal(false);
  protected readonly pausado = signal(false);
  protected readonly interagindo = signal(false);
  protected readonly abaOculta = signal(false);
  protected readonly semMovimento = signal(false);
  protected readonly intervaloMs = INTERVALO_BANNER_MS;

  private temporizador: ReturnType<typeof setInterval> | null = null;
  private fimDaTroca: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (typeof matchMedia === 'function') {
        this.semMovimento.set(matchMedia('(prefers-reduced-motion: reduce)').matches);
      }
      const aoMudarAba = () => this.abaOculta.set(document.hidden);
      document.addEventListener('visibilitychange', aoMudarAba);
      destroyRef.onDestroy(() => document.removeEventListener('visibilitychange', aoMudarAba));
    });

    // O temporizador acompanha o estado: ligado só quando nada pede para esperar.
    effect(() => {
      this.ativo();
      const parado =
        this.pausado() || this.interagindo() || this.abaOculta() || this.semMovimento();
      this.pararTemporizador();
      if (!parado) {
        this.temporizador = setInterval(() => this.avancar(), INTERVALO_BANNER_MS);
      }
    });

    destroyRef.onDestroy(() => {
      this.pararTemporizador();
      if (this.fimDaTroca) clearTimeout(this.fimDaTroca);
    });
  }

  protected avancar(): void {
    this.irPara(proximoBanner(this.ativo(), this.totalBanners));
  }

  protected voltar(): void {
    this.irPara(bannerAnterior(this.ativo(), this.totalBanners));
  }

  protected irPara(indice: number): void {
    const atual = this.ativo();
    if (indice === atual) return;
    this.trocou.set(true);
    this.saindo.set(atual);
    this.ativo.set(indice);
    if (this.fimDaTroca) clearTimeout(this.fimDaTroca);
    this.fimDaTroca = setTimeout(() => this.saindo.set(null), DURACAO_TROCA_MS);
  }

  protected alternarPausa(): void {
    this.pausado.update((p) => !p);
  }

  private pararTemporizador(): void {
    if (this.temporizador) clearInterval(this.temporizador);
    this.temporizador = null;
  }

  protected readonly workflowSteps: AssetItem[] = [
    {
      icon: 'user-plus',
      title: 'Cadastro e Verificação',
      description:
        'Empresas e investidores se cadastram na plataforma e passam por validações KYC/KYB e checagens regulatórias.',
    },
    {
      icon: 'file-search',
      title: 'Proposta e Análise',
      description:
        'A empresa solicita o crédito e a proposta é analisada com base em dados, regras e parecer técnico.',
    },
    {
      icon: 'file-check',
      title: 'Formalização e Escrow',
      description:
        'Com aprovação, o contrato é formalizado e o recurso fica em conta escrow segregada e auditável.',
    },
    {
      icon: 'send',
      title: 'Liberação e Acompanhamento',
      description:
        'Após condições cumpridas, o crédito é liberado e toda operação é acompanhada com rastreabilidade total.',
    },
  ];

  protected readonly indicators: AssetItem[] = [
    {
      icon: 'landmark',
      title: '100%',
      description: 'Ambiente regulado pelo Banco Central e pelo CMN',
    },
    {
      icon: 'shield-check',
      title: 'Segurança',
      description: 'Dados protegidos com criptografia de ponta',
    },
    {
      icon: 'history',
      title: 'Rastreabilidade',
      description: 'Do cadastro à liquidação com auditoria completa',
    },
    {
      icon: 'lock',
      title: 'Conexão segura',
      description: 'Empresas que precisam e investidores que confiam',
    },
    {
      icon: 'clipboard-check',
      title: 'Conformidade',
      description: 'KYC, KYB, PLD e governança em todas as etapas',
    },
  ];
}
