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
      title: 'Seguranca por desenho.',
      description:
        'Auditoria reforcada, segregacao patrimonial via conta escrow e PLD com consultas a COAF, OFAC, INTERPOL e MTE. Sua operacao registrada do inicio ao fim.',
    },
    {
      icon: 'credit-card',
      tone: 'secondary',
      title: 'Tomador.',
      description:
        'Cadastro publico, KYC documental, analise de credito assistida e formalizacao com CCB digital. Acompanhamento ponta a ponta.',
    },
    {
      icon: 'wallet',
      tone: 'devolutiva',
      title: 'Empresa credora.',
      description:
        'Visibilidade da carteira, recebimentos via escrow segregado e trilha auditavel das operacoes financiadas.',
    },
  ];
}
