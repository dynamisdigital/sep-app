import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { Observable, forkJoin } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';
import {
  AlterarStatusCredorRequest,
  CategoriaInvestidor,
  CredorGestaoResponse,
  EventoAuditoriaCredor,
  LancamentoEscrow,
  PerfilRiscoCredor,
} from '../../../../core/credores/credores-escrow.models';
import { CredoresEscrowService } from '../../../../core/credores/credores-escrow.service';
import { OperationalShellComponent } from '../../../../layout/operational-shell/operational-shell.component';
import {
  CATEGORIA_LABEL,
  PERFIL_RISCO_LABEL,
  STATUS_CREDOR_LABEL,
  TIPO_EVENTO_CREDOR_LABEL,
  TIPO_LANCAMENTO_LABEL,
  TOM_STATUS_CREDOR,
  sinalDoLancamento,
} from '../../credora/escrow/escrow-format';
import {
  formatarData,
  formatarMoeda,
  mensagemCredoraErro,
} from '../../credora/shared/credora-format';

type NovoStatus = AlterarStatusCredorRequest['status'];

// Detalhe do credor para a gestao: cadastro, posicao na escrow, extrato e trilha de auditoria. Quem
// gere (BACKOFFICE e ADMIN) aprova, reprova, suspende, reativa e ajusta perfil e categoria; os
// demais operadores so consultam. As regras (termo do investidor qualificado, motivo obrigatorio,
// transicoes permitidas) sao do backend; a tela mostra o que ele responder.
@Component({
  selector: 'sep-credor-detail-page',
  imports: [RouterLink, LucideAngularModule, OperationalShellComponent],
  templateUrl: './credor-detail-page.component.html',
  styleUrl: './credor-detail-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CredorDetailPageComponent implements OnInit {
  private readonly escrow = inject(CredoresEscrowService);
  private readonly auth = inject(AuthService);
  private readonly rota = inject(ActivatedRoute);

  private readonly id = this.rota.snapshot.paramMap.get('id') ?? '';

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly credor = signal<CredorGestaoResponse | null>(null);
  protected readonly extrato = signal<LancamentoEscrow[]>([]);
  protected readonly auditoria = signal<EventoAuditoriaCredor[]>([]);

  protected readonly motivo = signal('');
  protected readonly ocupado = signal(false);
  protected readonly acaoErro = signal<string | null>(null);
  protected readonly acaoMsg = signal<string | null>(null);

  protected readonly podeGerir = computed(() => {
    const role = this.auth.currentUser()?.role;
    return role === 'BACKOFFICE' || role === 'ADMIN';
  });

  protected readonly perfis = Object.keys(PERFIL_RISCO_LABEL) as PerfilRiscoCredor[];
  protected readonly categorias = Object.keys(CATEGORIA_LABEL) as CategoriaInvestidor[];

  protected readonly statusLabel = STATUS_CREDOR_LABEL;
  protected readonly statusTom = TOM_STATUS_CREDOR;
  protected readonly categoriaLabel = CATEGORIA_LABEL;
  protected readonly perfilLabel = PERFIL_RISCO_LABEL;
  protected readonly eventoLabel = TIPO_EVENTO_CREDOR_LABEL;
  protected readonly lancamentoLabel = TIPO_LANCAMENTO_LABEL;
  protected readonly sinal = sinalDoLancamento;
  protected readonly formatarMoeda = formatarMoeda;
  protected readonly formatarData = formatarData;

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    forkJoin({
      credor: this.escrow.consultarCredor(this.id),
      extrato: this.escrow.listarExtratoDoCredor(this.id),
      auditoria: this.escrow.listarAuditoria(this.id),
    }).subscribe({
      next: (dados) => {
        this.credor.set(dados.credor);
        this.extrato.set(dados.extrato);
        this.auditoria.set(dados.auditoria);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(
          err.status === 404
            ? 'Credor não encontrado.'
            : mensagemCredoraErro(err, 'Não foi possível carregar o credor.'),
        );
        this.loading.set(false);
      },
    });
  }

  digitarMotivo(evento: Event): void {
    this.motivo.set((evento.target as HTMLInputElement).value);
  }

  mudarStatus(status: NovoStatus): void {
    if (!this.motivo().trim()) {
      this.acaoErro.set('Informe o motivo da decisão.');
      return;
    }
    this.executar(
      this.escrow.alterarStatus(this.id, { status, motivo: this.motivo().trim() }),
      'Situação do credor atualizada.',
      () => this.motivo.set(''),
    );
  }

  mudarPerfil(evento: Event): void {
    const perfil = (evento.target as HTMLSelectElement).value as PerfilRiscoCredor;
    this.executar(this.escrow.alterarPerfilRisco(this.id, perfil), 'Perfil de risco atualizado.');
  }

  mudarCategoria(evento: Event): void {
    const categoria = (evento.target as HTMLSelectElement).value as CategoriaInvestidor;
    this.executar(this.escrow.alterarCategoria(this.id, categoria), 'Categoria atualizada.');
  }

  private executar(
    chamada: Observable<CredorGestaoResponse>,
    mensagem: string,
    aoConcluir?: () => void,
  ): void {
    this.ocupado.set(true);
    this.acaoErro.set(null);
    this.acaoMsg.set(null);
    chamada.subscribe({
      next: () => {
        aoConcluir?.();
        this.acaoMsg.set(mensagem);
        this.ocupado.set(false);
        this.carregar();
      },
      error: (err: HttpErrorResponse) => {
        this.acaoErro.set(mensagemCredoraErro(err, 'Não foi possível concluir a operação.'));
        this.ocupado.set(false);
        // Recarrega para que os seletores voltem ao valor real se a mudanca foi recusada.
        this.carregar();
      },
    });
  }
}
