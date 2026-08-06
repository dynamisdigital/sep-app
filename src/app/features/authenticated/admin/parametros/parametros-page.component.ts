import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { mensagemDeErroDaApi } from '../../../../core/api/api-error';
import { ParametroOperacional } from '../../../../core/api/api.models';
import { GovernancaService } from '../../../../core/governanca/governanca.service';

@Component({
  selector: 'sep-parametros-page',
  imports: [RouterLink],
  templateUrl: './parametros-page.component.html',
  styleUrl: './parametros-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParametrosPageComponent implements OnInit {
  private readonly governanca = inject(GovernancaService);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly parametros = signal<ParametroOperacional[]>([]);

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.governanca.listarParametros().subscribe({
      next: (lista) => {
        this.parametros.set(lista);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(mensagemDeErroDaApi(err, 'Nao foi possivel carregar os parametros.'));
        this.loading.set(false);
      },
    });
  }
}
