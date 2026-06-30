import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

type LandingTone = 'primary' | 'secondary' | 'devolutiva';

interface LandingFeature {
  icon: string;
  tone: LandingTone;
  title: string;
  description: string;
}

@Component({
  selector: 'sep-landing',
  imports: [RouterLink, LucideAngularModule],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingComponent {
  protected readonly features: LandingFeature[] = [
    {
      icon: 'shield',
      tone: 'primary',
      title: 'Segurança por desenho.',
      description:
        'Auditoria reforçada, segregação patrimonial via conta escrow e PLD com consultas a COAF, OFAC, INTERPOL e MTE. Sua operação registrada do início ao fim.',
    },
    {
      icon: 'credit-card',
      tone: 'secondary',
      title: 'Tomador.',
      description:
        'Cadastro público, KYC documental, análise de crédito assistida e formalização com CCB digital. Acompanhamento ponta a ponta.',
    },
    {
      icon: 'wallet',
      tone: 'devolutiva',
      title: 'Empresa credora.',
      description:
        'Visibilidade da carteira, recebimentos via escrow segregado e trilha auditável das operações financiadas.',
    },
  ];
}
