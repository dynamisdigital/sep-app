import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface OnboardingPath {
  label: string;
  description: string;
  route: string;
}

@Component({
  selector: 'sep-onboarding-home',
  imports: [RouterLink],
  templateUrl: './onboarding-home.component.html',
  styleUrl: './onboarding-home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingHomeComponent {
  protected readonly paths: OnboardingPath[] = [
    {
      label: 'Pessoa fisica',
      description: 'Inicie o KYC: dados pessoais, documentos e verificacao.',
      route: '/app/onboarding/pessoa',
    },
    {
      label: 'Empresa',
      description: 'Inicie o KYB: dados da empresa, representantes e documentos.',
      route: '/app/onboarding/empresa',
    },
  ];
}
