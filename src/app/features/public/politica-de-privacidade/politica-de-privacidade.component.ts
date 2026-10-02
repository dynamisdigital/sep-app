import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { CONTATO_SEP } from '../shared/site-conteudo';
import { PublicShellComponent } from '../shared/public-shell.component';

interface SecaoLegal {
  id: string;
  titulo: string;
}

/** Linha da tabela de tratamento: dado, finalidade, base legal e prazo. */
interface TratamentoDado {
  dado: string;
  finalidade: string;
  base: string;
  prazo: string;
}

@Component({
  selector: 'sep-politica-privacidade-page',
  imports: [RouterLink, LucideAngularModule, PublicShellComponent],
  templateUrl: './politica-de-privacidade.component.html',
  styleUrl: './politica-de-privacidade.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PoliticaDePrivacidadeComponent {
  protected readonly contato = CONTATO_SEP;
  protected readonly vigencia = '21 de agosto de 2026';

  protected readonly secoes: SecaoLegal[] = [
    { id: 'quem', titulo: '1. Quem trata seus dados' },
    { id: 'dados', titulo: '2. Dados que tratamos' },
    { id: 'bases', titulo: '3. Finalidades e bases legais' },
    { id: 'compartilhamento', titulo: '4. Com quem compartilhamos' },
    { id: 'open-finance', titulo: '5. Open Finance' },
    { id: 'retencao', titulo: '6. Por quanto tempo guardamos' },
    { id: 'seguranca', titulo: '7. Como protegemos' },
    { id: 'direitos', titulo: '8. Seus direitos' },
    { id: 'cookies', titulo: '9. Cookies e armazenamento local' },
    { id: 'alteracoes', titulo: '10. Alterações desta política' },
    { id: 'encarregado', titulo: '11. Canal de privacidade' },
  ];

  // A tabela é o coração da política: sem ela, "tratamos seus dados conforme a LGPD" não informa
  // nada ao titular sobre o que de fato acontece com cada dado.
  protected readonly tratamentos: TratamentoDado[] = [
    {
      dado: 'Identificação (nome, CPF, CNPJ, razão social)',
      finalidade: 'Verificar quem contrata e cumprir obrigações de cadastro',
      base: 'Obrigação legal e execução de contrato',
      prazo: '5 anos após o fim da relação',
    },
    {
      dado: 'Contato (e-mail, telefone, endereço)',
      finalidade: 'Comunicar-se sobre operações e responder solicitações',
      base: 'Execução de contrato e consentimento',
      prazo: 'Enquanto durar a relação, e 5 anos após',
    },
    {
      dado: 'Documentos e imagem (RG, CNH, selfie, comprovantes)',
      finalidade: 'Confirmar identidade e prevenir fraude',
      base: 'Obrigação legal (prevenção à lavagem de dinheiro)',
      prazo: '5 anos após o fim da relação',
    },
    {
      dado: 'Dados financeiros e de crédito',
      finalidade: 'Avaliar capacidade de pagamento e formar a decisão de crédito',
      base: 'Execução de contrato e legítimo interesse',
      prazo: '5 anos após a quitação da operação',
    },
    {
      dado: 'Extrato compartilhado por Open Finance',
      finalidade: 'Aprimorar a leitura de capacidade de pagamento da proposta',
      base: 'Consentimento específico e revogável',
      prazo: '12 meses, ou até a revogação',
    },
    {
      dado: 'Registros de acesso e trilha de auditoria',
      finalidade: 'Segurança, rastreabilidade e defesa em processos',
      base: 'Obrigação legal (Marco Civil da Internet)',
      prazo: '6 meses para registros de acesso; 5 anos para a trilha',
    },
  ];
}
