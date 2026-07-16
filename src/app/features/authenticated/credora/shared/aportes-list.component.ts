import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AporteCredoraResponse, StatusAporteCredora } from '../../../../core/api/api.models';
import { CredoraService } from '../../../../core/credora/credora.service';
import { formatarData, formatarMoeda } from './credora-format';
import { AporteStatusComponent } from './aporte-status.component';

// Mensagem operacional por estado do aporte (Fase 4: provider fake/local, sem endpoint de
// reconciliacao). O contrato publico nao traz motivo tecnico de falha.
const MENSAGENS_STATUS: Record<StatusAporteCredora, string> = {
  PENDENTE: 'Processamento local em andamento, sem garantia de liquidacao.',
  EM_PROCESSAMENTO: 'Processamento local em andamento, sem garantia de liquidacao.',
  LIQUIDADO: 'Status confirmado pelo backend.',
  FALHOU: 'O processamento falhou. Nao ha reprocesso automatico nesta fase.',
};

// Lista somente leitura dos aportes de uma operacao (F-18.4 / GET owner-scoped da Sprint 29),
// compartilhada entre o recorte operacional (FINANCEIRO/ADMIN) e a carteira da credora dona. A
// atualizacao acontece uma vez na entrada e depois somente pelo botao "Atualizar status" — sem
// polling e sem endpoint de reconciliacao. Falha da lista nao derruba a pagina que a embute: o
// erro fica localizado aqui, com retry proprio. Nenhuma mutacao e oferecida.
@Component({
  selector: 'sep-aportes-list',
  imports: [AporteStatusComponent],
  templateUrl: './aportes-list.component.html',
  styleUrl: './aportes-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AportesListComponent implements OnInit {
  private readonly credoraService = inject(CredoraService);
  private readonly destroyRef = inject(DestroyRef);

  readonly operacaoId = input.required<string>();

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly aportes = signal<AporteCredoraResponse[]>([]);
  protected readonly carregado = signal(false);

  protected readonly formatarData = formatarData;
  protected readonly formatarMoeda = formatarMoeda;
  protected readonly mensagens = MENSAGENS_STATUS;

  ngOnInit(): void {
    this.atualizar();
  }

  // Reconsulta explicita (entrada, botao "Atualizar status" ou pos-registro da pagina
  // operacional). Guard de reentrada evita consultas concorrentes.
  atualizar(): void {
    if (this.loading()) {
      return;
    }
    this.loading.set(true);
    this.errorMessage.set(null);
    this.credoraService
      .listarAportes(this.operacaoId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (aportes) => {
          // Ordem recebida do backend (criacao decrescente); a UI nao reordena.
          this.aportes.set(aportes);
          this.carregado.set(true);
          this.loading.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.loading.set(false);
          // 404 neutro (owner-scoped) e falha real recebem o mesmo tratamento localizado; a
          // mensagem nao distingue inexistencia de falta de acesso nem ecoa identificador.
          this.errorMessage.set(
            err.status === 404
              ? 'Aportes indisponiveis para esta operacao.'
              : 'Nao foi possivel carregar os aportes.',
          );
        },
      });
  }
}
