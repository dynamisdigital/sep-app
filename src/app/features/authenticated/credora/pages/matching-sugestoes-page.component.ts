import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import { MatchingSugestaoResponse } from '../../../../core/api/api.models';
import { CredoraService } from '../../../../core/credora/credora.service';
import {
  formatarData,
  formatarMoeda,
  idCurto,
  mensagemCredoraErro,
} from '../shared/credora-format';
import { MatchingStatusComponent } from '../shared/matching-status.component';

// Fila de sugestoes de matching (F-18.2 / backend Sprint 30) para FINANCEIRO/ADMIN. O GET e
// refresh-on-read: o backend pode persistir e auditar sugestoes novas antes de listar as SUGERIDA —
// por isso a consulta acontece UMA vez na entrada e depois somente por gesto explicito no botao
// "Atualizar sugestoes" (sem interval, sem refresh ao recuperar foco, sem polling). A lista exibida
// nao e fonte autoritativa: a decisao acontece no detalhe, que reconsulta o backend.
@Component({
  selector: 'sep-matching-sugestoes-page',
  imports: [RouterLink, MatchingStatusComponent],
  templateUrl: './matching-sugestoes-page.component.html',
  styleUrl: './matching-sugestoes-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MatchingSugestoesPageComponent implements OnInit {
  private readonly credoraService = inject(CredoraService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly formatarData = formatarData;
  protected readonly formatarMoeda = formatarMoeda;
  protected readonly idCurto = idCurto;

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly sugestoes = signal<MatchingSugestaoResponse[]>([]);

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    if (this.loading()) {
      return;
    }
    this.loading.set(true);
    this.errorMessage.set(null);
    this.credoraService
      .listarSugestoesMatching()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (sugestoes) => {
          this.sugestoes.set(sugestoes);
          this.loading.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.loading.set(false);
          this.errorMessage.set(
            mensagemCredoraErro(err, 'Nao foi possivel carregar as sugestoes de matching.'),
          );
        },
      });
  }
}
