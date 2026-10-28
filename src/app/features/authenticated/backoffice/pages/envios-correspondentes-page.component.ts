import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { EnvioDocumentosResponse } from '../../../../core/correspondentes/correspondentes.models';
import { CorrespondentesService } from '../../../../core/correspondentes/correspondentes.service';
import { OperationalShellComponent } from '../../../../layout/operational-shell/operational-shell.component';
import {
  formatarData,
  ROTULO_ENVIO,
  TOM_ENVIO,
} from '../../correspondentes/correspondentes.format';

// Validacao dos envios de correspondentes (BACKOFFICE/FINANCEIRO/ADMIN). O correspondente atesta a
// conferencia, mas quem valida ou devolve e o backoffice: captar e decidir ficam separados.
@Component({
  selector: 'sep-envios-correspondentes-page',
  imports: [OperationalShellComponent, RouterLink, FormsModule],
  templateUrl: './envios-correspondentes-page.component.html',
  styleUrl: '../../correspondentes/correspondentes.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnviosCorrespondentesPageComponent implements OnInit {
  private readonly service = inject(CorrespondentesService);

  protected readonly envios = signal<EnvioDocumentosResponse[]>([]);
  protected readonly carregando = signal(true);
  protected readonly erro = signal<string | null>(null);
  protected readonly aviso = signal<string | null>(null);
  protected readonly observacoes: Record<string, string> = {};

  protected readonly rotulo = ROTULO_ENVIO;
  protected readonly tom = TOM_ENVIO;
  protected readonly data = formatarData;

  ngOnInit(): void {
    this.carregar();
  }

  private carregar(): void {
    this.service.listarEnviosParaValidacao().subscribe({
      next: (e) => {
        this.envios.set(e);
        this.carregando.set(false);
      },
      error: () => {
        this.erro.set('Não foi possível carregar os envios.');
        this.carregando.set(false);
      },
    });
  }

  protected decidir(envio: EnvioDocumentosResponse, decisao: 'VALIDAR' | 'DEVOLVER'): void {
    this.erro.set(null);
    this.aviso.set(null);
    this.service
      .validarEnvio(envio.id, { decisao, observacao: this.observacoes[envio.id] ?? '' })
      .subscribe({
        next: () => {
          this.aviso.set(
            decisao === 'VALIDAR'
              ? `Envio de ${envio.clienteNome} validado.`
              : `Envio de ${envio.clienteNome} devolvido ao correspondente.`,
          );
          this.carregar();
        },
        error: (e: HttpErrorResponse) =>
          this.erro.set(e.error?.message ?? 'Não foi possível registrar a decisão.'),
      });
  }
}
