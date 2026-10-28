import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { OportunidadeResponse, StatusOportunidade } from '../../../../core/api/api.models';
import { CredoraService } from '../../../../core/credora/credora.service';
import { OperationalShellComponent } from '../../../../layout/operational-shell/operational-shell.component';
import {
  formatarData,
  formatarMoeda,
  formatarTaxaMensal,
  idCurto,
  mensagemCredoraErro,
} from '../shared/credora-format';

// Lista as oportunidades disponiveis para a credora autenticada. O backend resolve ownership e
// disponibilidade; a tela apenas apresenta, soma os agregados da propria lista e linka ao
// detalhe. Nenhuma regra de elegibilidade ou alocacao e decidida aqui.
//
// Tela sem arte de designer: construida no padrao visual do tema, na mesma linguagem dos
// Mockups 35 e 36. A referencia em `image/mockups` e captura da implementacao.
@Component({
  selector: 'sep-oportunidades-page',
  imports: [RouterLink, LucideAngularModule, OperationalShellComponent],
  templateUrl: './oportunidades-page.component.html',
  styleUrl: './oportunidades-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OportunidadesPageComponent implements OnInit {
  private readonly credora = inject(CredoraService);

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly oportunidades = signal<OportunidadeResponse[]>([]);

  protected readonly formatarMoeda = formatarMoeda;
  protected readonly formatarData = formatarData;
  protected readonly formatarTaxaMensal = formatarTaxaMensal;
  protected readonly idCurto = idCurto;

  protected readonly disponiveis = computed(() =>
    this.oportunidades().filter((o) => o.status === 'DISPONIVEL'),
  );

  // Agregados somados da propria lista devolvida, para os numeros fecharem entre si.
  protected readonly valorDisponivel = computed(
    () => Math.round(this.disponiveis().reduce((s, o) => s + o.valor, 0) * 100) / 100,
  );

  protected readonly prazoMedio = computed(() => {
    const lista = this.disponiveis();
    if (!lista.length) return 0;
    return Math.round(lista.reduce((s, o) => s + o.prazoMeses, 0) / lista.length);
  });

  protected readonly taxaMedia = computed(() => {
    const lista = this.disponiveis();
    if (!lista.length) return 0;
    return lista.reduce((s, o) => s + o.taxaJurosMensal, 0) / lista.length;
  });

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.credora.listarOportunidades().subscribe({
      next: (oportunidades) => {
        this.oportunidades.set(oportunidades);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(
          mensagemCredoraErro(err, 'Não foi possível carregar as oportunidades.'),
        );
        this.loading.set(false);
      },
    });
  }

  statusTom(status: StatusOportunidade): 'green' | 'amber' {
    return status === 'DISPONIVEL' ? 'green' : 'amber';
  }

  statusRotulo(status: StatusOportunidade): string {
    return status === 'DISPONIVEL' ? 'Disponível' : 'Encerrada';
  }
}
