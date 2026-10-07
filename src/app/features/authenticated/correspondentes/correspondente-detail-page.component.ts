import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

import {
  CorrespondenteResponse,
  VinculoResponse,
} from '../../../core/correspondentes/correspondentes.models';
import { CorrespondentesService } from '../../../core/correspondentes/correspondentes.service';
import { OperationalShellComponent } from '../../../layout/operational-shell/operational-shell.component';
import {
  descreverPrazo,
  formatarData,
  formatarMoeda,
  ROTULO_CADASTRO,
  ROTULO_MOTIVO,
  ROTULO_VINCULO,
  TOM_CADASTRO,
  TOM_VINCULO,
} from './correspondentes.format';

// Detalhe de um correspondente (ADMIN): cadastro, renovacao e historico de vinculos. A reatribuicao
// representa a eleicao do cliente (outro correspondente ou o SEP direto) registrada pela
// administracao; o cliente final nao tem tela neste modulo.
@Component({
  selector: 'sep-correspondente-detail-page',
  imports: [OperationalShellComponent, RouterLink, FormsModule],
  templateUrl: './correspondente-detail-page.component.html',
  styleUrl: './correspondentes.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CorrespondenteDetailPageComponent implements OnInit {
  private readonly service = inject(CorrespondentesService);
  private readonly route = inject(ActivatedRoute);

  protected readonly correspondente = signal<CorrespondenteResponse | null>(null);
  protected readonly vinculos = signal<VinculoResponse[]>([]);
  protected readonly outros = signal<CorrespondenteResponse[]>([]);
  protected readonly carregando = signal(true);
  protected readonly erro = signal<string | null>(null);
  protected readonly aviso = signal<string | null>(null);
  protected novaValidade = '2027-10-07';

  protected readonly rotulo = ROTULO_CADASTRO;
  protected readonly tom = TOM_CADASTRO;
  protected readonly rotuloVinculo = ROTULO_VINCULO;
  protected readonly tomVinculo = TOM_VINCULO;
  protected readonly motivo = ROTULO_MOTIVO;
  protected readonly data = formatarData;
  protected readonly moeda = formatarMoeda;
  protected readonly prazo = descreverPrazo;

  private id = '';

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id') ?? '';
    this.carregar();
  }

  private carregar(): void {
    this.carregando.set(true);
    this.service.consultarCorrespondente(this.id).subscribe({
      next: (c) => {
        this.correspondente.set(c);
        this.carregando.set(false);
      },
      error: () => {
        this.erro.set('Correspondente não encontrado.');
        this.carregando.set(false);
      },
    });
    this.service.listarVinculos(this.id).subscribe({
      next: (v) => this.vinculos.set(v),
      error: () => this.erro.set('Não foi possível carregar os vínculos.'),
    });
    this.service.consultarRede().subscribe({
      next: (r) => this.outros.set(r.correspondentes.filter((c) => c.id !== this.id)),
    });
  }

  protected renovar(): void {
    this.erro.set(null);
    this.service.renovarCadastro(this.id, { novaValidade: this.novaValidade }).subscribe({
      next: (c) => {
        this.correspondente.set(c);
        this.aviso.set('Cadastro renovado. A nova validade já vale para a apuração de vigência.');
      },
      error: () => this.erro.set('Não foi possível renovar o cadastro.'),
    });
  }

  protected reatribuir(vinculo: VinculoResponse, destino: string): void {
    if (!destino) return;
    this.erro.set(null);
    this.service
      .reatribuirVinculo(vinculo.id, {
        correspondenteDestinoId: destino === 'SEP' ? null : destino,
      })
      .subscribe({
        next: () => {
          this.aviso.set(
            destino === 'SEP'
              ? `${vinculo.clienteNome} passa a operar direto com o SEP.`
              : `${vinculo.clienteNome} foi vinculado a outro correspondente.`,
          );
          this.carregar();
        },
        error: () => this.erro.set('Não foi possível reatribuir o vínculo.'),
      });
  }

  protected podeReatribuir(v: VinculoResponse): boolean {
    return v.status === 'VIGENTE' || v.status === 'PERDIDO';
  }
}
