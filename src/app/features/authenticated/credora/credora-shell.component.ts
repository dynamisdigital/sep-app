import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { EmpresaCredoraResponse } from '../../../core/api/api.models';
import { CredoraService } from '../../../core/credora/credora.service';

interface CredoraLink {
  label: string;
  description: string;
  route: string;
}

// Landing da jornada credora. Resolve a presenca de credora (GET /credores/me): sem credora (404),
// apresenta apenas o caminho de cadastro; com credora, libera perfil, oportunidades e carteira.
// Elegibilidade, ownership e demais regras pertencem ao backend — o shell apenas navega.
@Component({
  selector: 'sep-credora-shell',
  imports: [RouterLink],
  templateUrl: './credora-shell.component.html',
  styleUrl: './credora-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CredoraShellComponent implements OnInit {
  private readonly credora = inject(CredoraService);

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly empresaCredora = signal<EmpresaCredoraResponse | null>(null);

  protected readonly links: CredoraLink[] = [
    {
      label: 'Perfil e elegibilidade',
      description: 'Status cadastral e elegibilidade derivada do onboarding.',
      route: '/app/credora/perfil',
    },
    {
      label: 'Oportunidades',
      description: 'Operacoes disponiveis para investimento.',
      route: '/app/credora/oportunidades',
    },
    {
      label: 'Carteira',
      description: 'Operacoes financiadas e acompanhamento de cobranca.',
      route: '/app/credora/carteira',
    },
  ];

  ngOnInit(): void {
    this.credora.consultarMinhaCredora().subscribe({
      next: (credora) => {
        this.empresaCredora.set(credora);
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        // 404 = usuario ainda sem credora (estado desejado, oferece cadastro), nao erro duro.
        if (error.status !== 404) {
          this.errorMessage.set('Nao foi possivel carregar sua credora. Tente novamente.');
        }
        this.loading.set(false);
      },
    });
  }
}
