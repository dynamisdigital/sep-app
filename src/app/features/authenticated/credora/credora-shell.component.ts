import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { EmpresaCredoraResponse } from '../../../core/api/api.models';
import { CredoraService } from '../../../core/credora/credora.service';
import { OperationalShellComponent } from '../../../layout/operational-shell/operational-shell.component';

interface CredoraLink {
  label: string;
  description: string;
  route: string;
  icone: string;
  tom: 'blue' | 'green' | 'purple';
}

interface Motivo {
  titulo: string;
  descricao: string;
  icone: string;
  tom: 'blue' | 'green' | 'purple' | 'amber';
}

// As quatro razoes do desenho. Ficam aqui, e nao no template, para o cartao e a ordem
// andarem juntos.
const MOTIVOS: Motivo[] = [
  {
    titulo: 'Receba propostas',
    descricao: 'Receba propostas de crédito de tomadores interessados.',
    icone: 'users',
    tom: 'blue',
  },
  {
    titulo: 'Acompanhe oportunidades',
    descricao: 'Visualize e gerencie oportunidades em tempo real.',
    icone: 'chart-column',
    tom: 'green',
  },
  {
    titulo: 'Gerencie sua carteira',
    descricao: 'Acompanhe contratos, parcelas e recebimentos.',
    icone: 'wallet',
    tom: 'purple',
  },
  {
    titulo: 'Mais segurança',
    descricao: 'Operações seguras, auditadas e em conformidade.',
    icone: 'shield-check',
    tom: 'amber',
  },
];

// Landing da jornada credora (Mockup 35). Resolve a presenca de credora (GET /credores/me):
// sem credora (404), a tela e o convite ao cadastro; com credora, libera perfil,
// oportunidades e carteira. Elegibilidade, ownership e demais regras pertencem ao backend —
// o shell apenas navega.
@Component({
  selector: 'sep-credora-shell',
  imports: [RouterLink, LucideAngularModule, OperationalShellComponent],
  templateUrl: './credora-shell.component.html',
  styleUrl: './credora-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CredoraShellComponent implements OnInit {
  private readonly credora = inject(CredoraService);

  protected readonly motivos = MOTIVOS;

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly empresaCredora = signal<EmpresaCredoraResponse | null>(null);

  protected readonly links: CredoraLink[] = [
    {
      label: 'Perfil e elegibilidade',
      description: 'Status cadastral e elegibilidade derivada do onboarding.',
      route: '/app/credora/perfil',
      icone: 'building-2',
      tom: 'blue',
    },
    {
      label: 'Oportunidades',
      description: 'Operações disponíveis para investimento.',
      route: '/app/credora/oportunidades',
      icone: 'chart-column',
      tom: 'green',
    },
    {
      label: 'Carteira',
      description: 'Operações financiadas e acompanhamento de cobrança.',
      route: '/app/credora/carteira',
      icone: 'wallet',
      tom: 'purple',
    },
  ];

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.credora.consultarMinhaCredora().subscribe({
      next: (credora) => {
        this.empresaCredora.set(credora);
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        // 404 = usuario ainda sem credora (estado desejado, oferece cadastro), nao erro duro.
        this.empresaCredora.set(null);
        if (error.status !== 404) {
          this.errorMessage.set('Não foi possível carregar sua credora. Tente novamente.');
        }
        this.loading.set(false);
      },
    });
  }
}
