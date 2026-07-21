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
import { Subscription } from 'rxjs';

import { ChavePixResponse } from '../../../../core/api/api.models';
import { PixService } from '../../../../core/pix/pix.service';
import { formatarDataHora, mensagemPixErro, TIPO_CHAVE_LABEL } from '../shared/pix-format';
import { ChavePixStatusComponent } from '../shared/chave-pix-status.component';

// Gestao assistida das chaves Pix da conta operacional/escrow (F-20.2 / backend Sprint 31), para
// FINANCEIRO e ADMIN. Esta Task entrega apenas a leitura: a lista chega sempre mascarada e inclui
// o historico INATIVA, na ordem devolvida pelo backend (mais recentes primeiro) — a UI nao
// reordena, nao filtra e nao deriva estado. O cadastro (F-20.3) e a remocao (F-20.4) entram nas
// suas Tasks; nenhuma mutacao e oferecida aqui.
//
// O GET nunca responde 404: sem conta operacional o backend devolve lista vazia. Por isso as
// superficies desta tela sao tres — lista, vazia e erro tecnico — e o 404 neutro pertence a
// remocao. A atualizacao acontece uma vez na entrada e depois somente por gesto explicito
// ("Atualizar"), sem polling e sem refresh ao recuperar foco.
@Component({
  selector: 'sep-chaves-pix-page',
  imports: [RouterLink, ChavePixStatusComponent],
  templateUrl: './chaves-pix-page.component.html',
  styleUrl: './chaves-pix-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChavesPixPageComponent implements OnInit {
  private readonly pixService = inject(PixService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly chaves = signal<ChavePixResponse[]>([]);
  protected readonly carregado = signal(false);

  protected readonly formatarDataHora = formatarDataHora;
  protected readonly tipoLabel = TIPO_CHAVE_LABEL;

  private consultaAtual: Subscription | null = null;

  ngOnInit(): void {
    this.carregar();
  }

  // Consulta unica na entrada e reconsulta por gesto. Uma consulta em andamento e SUBSTITUIDA:
  // a resposta tardia da anterior e cancelada e nao sobrescreve a lista mais nova. O botao fica
  // desabilitado durante a carga, entao um duplo toque nao dispara dois GETs.
  carregar(): void {
    this.consultaAtual?.unsubscribe();
    this.loading.set(true);
    this.errorMessage.set(null);
    this.consultaAtual = this.pixService
      .listarChavesPix()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (chaves) => {
          this.chaves.set(chaves);
          this.carregado.set(true);
          this.loading.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.loading.set(false);
          this.errorMessage.set(
            mensagemPixErro(err, 'Nao foi possivel carregar as chaves Pix da conta operacional.'),
          );
        },
      });
  }
}
