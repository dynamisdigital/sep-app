import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface CreditoAtalho {
  label: string;
  description: string;
  route: string;
}

@Component({
  selector: 'sep-credito-home',
  imports: [RouterLink],
  templateUrl: './credito-home.component.html',
  styleUrl: './credito-home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreditoHomeComponent {
  protected readonly atalhos: CreditoAtalho[] = [
    {
      label: 'Minhas propostas',
      description: 'Acompanhe o status das suas propostas de credito.',
      route: '/app/credito/propostas',
    },
    {
      label: 'Nova proposta',
      description: 'Solicite credito a partir de um onboarding aprovado.',
      route: '/app/credito/propostas/nova',
    },
  ];
}
