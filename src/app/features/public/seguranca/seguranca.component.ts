import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { PublicShellComponent } from '../shared/public-shell.component';
import { SiteCartao, SiteLinha } from '../shared/site-conteudo';

// Página institucional de Segurança. Cada item descreve um controle que existe de fato no
// produto — MFA, step-up, trilha, segregação e papéis —, e não uma intenção.
@Component({
  selector: 'sep-seguranca-page',
  imports: [RouterLink, LucideAngularModule, PublicShellComponent],
  templateUrl: './seguranca.component.html',
  styleUrl: './seguranca.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SegurancaComponent {
  protected readonly acesso: SiteCartao[] = [
    {
      titulo: 'Segunda etapa por TOTP',
      descricao:
        'A conta pode exigir um código de aplicativo autenticador no login. O segredo fica no seu dispositivo; a plataforma guarda apenas a chave de verificação.',
      icone: 'smartphone',
      tom: 'green',
    },
    {
      titulo: 'Confirmação adicional na operação',
      descricao:
        'Alterar papéis de um usuário ou um parâmetro operacional pede uma segunda confirmação de identidade no momento da ação, não só no login.',
      icone: 'lock-keyhole',
      tom: 'blue',
    },
    {
      titulo: 'Perfis com alcance definido',
      descricao:
        'Cada papel enxerga apenas as áreas que lhe cabem. A verificação acontece no servidor, e o menu apenas reflete o que já foi decidido lá.',
      icone: 'shield-check',
      tom: 'purple',
    },
    {
      titulo: 'Bloqueio por tentativas',
      descricao:
        'Sequências de senha incorreta bloqueiam a conta temporariamente, e o desbloqueio passa pela administração.',
      icone: 'lock',
      tom: 'amber',
    },
  ];

  protected readonly dados: SiteCartao[] = [
    {
      titulo: 'Trilha de auditoria',
      descricao:
        'Toda alteração sensível guarda quem fez, quando, o valor anterior, o novo e a justificativa. O histórico é versionado e não se apaga.',
      icone: 'history',
      tom: 'blue',
    },
    {
      titulo: 'Segregação patrimonial',
      descricao:
        'Os recursos das operações transitam em conta segregada. O dinheiro das partes não se mistura ao caixa da plataforma.',
      icone: 'landmark',
      tom: 'green',
    },
    {
      titulo: 'Documentos com impressão digital',
      descricao:
        'Cada versão de contrato tem hash SHA-256 registrado, o que permite conferir depois que o arquivo é exatamente o que foi assinado.',
      icone: 'file-check',
      tom: 'purple',
    },
    {
      titulo: 'Dados em trânsito e em repouso',
      descricao:
        'O tráfego usa TLS e os documentos ficam cifrados. Documentos de terceiros aparecem mascarados nas telas — nunca o número completo.',
      icone: 'fingerprint',
      tom: 'amber',
    },
  ];

  /** O que o operador vê na própria conta, e onde. */
  protected readonly conta: SiteLinha[] = [
    { rotulo: 'Habilitar segunda etapa', valor: 'Meu perfil › Configurar TOTP' },
    { rotulo: 'Trocar a senha', valor: 'Meu perfil › Alterar senha' },
    { rotulo: 'Conferir o papel da conta', valor: 'Meu perfil' },
    { rotulo: 'Relatar um incidente', valor: 'contato@dynamisbank.com' },
  ];
}
