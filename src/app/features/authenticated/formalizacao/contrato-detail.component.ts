import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { ContratoResponse, VersaoContratoResponse } from '../../../core/api/api.models';
import { AuthService } from '../../../core/auth/auth.service';
import { ContratosService } from '../../../core/contratos/contratos.service';
import {
  STATUS_FORMALIZACAO_LABEL,
  formatarData,
  idCurto,
  mensagemFormalizacaoErro,
} from './shared/formalizacao-format';

// Leitura somente do contrato gerado: status, metadados, conteudo da versao,
// clausulas e historico de versoes. Selecionar uma versao apenas troca a
// visualizacao local; nao muta o contrato nem a versao vigente do backend.
@Component({
  selector: 'sep-contrato-detail',
  imports: [],
  templateUrl: './contrato-detail.component.html',
  styleUrl: './contrato-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContratoDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly contratos = inject(ContratosService);
  private readonly auth = inject(AuthService);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly contrato = signal<ContratoResponse | null>(null);
  protected readonly versoes = signal<VersaoContratoResponse[]>([]);
  protected readonly versaoSelecionada = signal<VersaoContratoResponse | null>(null);
  protected readonly aceitando = signal(false);
  protected readonly aceiteErrorMessage = signal<string | null>(null);

  protected readonly statusLabel = STATUS_FORMALIZACAO_LABEL;
  protected readonly formatarData = formatarData;
  protected readonly idCurto = idCurto;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.carregar(id);
    }
  }

  carregar(id: string): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    // Contrato e a fonte primaria: ja traz a versao vigente (conteudo + clausulas).
    this.contratos.consultarContrato(id).subscribe({
      next: (contrato) => {
        this.contrato.set(contrato);
        this.versaoSelecionada.set(contrato.versaoVigente);
        this.loading.set(false);
        this.carregarHistorico(id);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(
          mensagemFormalizacaoErro(err, 'Nao foi possivel carregar o contrato.'),
        );
        this.loading.set(false);
      },
    });
  }

  // Historico de versoes e complementar (abas). Se falhar, a leitura do contrato e
  // da versao vigente permanece; apenas as abas de versoes anteriores ficam ausentes.
  private carregarHistorico(id: string): void {
    this.contratos.listarVersoes(id).subscribe({
      next: (versoes) => this.versoes.set(versoes),
      error: () => this.versoes.set([]),
    });
  }

  selecionarVersao(versao: VersaoContratoResponse): void {
    this.versaoSelecionada.set(versao);
  }

  ehVersaoVigente(versao: VersaoContratoResponse): boolean {
    return this.contrato()?.versaoVigente?.id === versao.id;
  }

  // Operacao sensivel: o backend exige step-up (@RequireStepUp). O token e coletado
  // no fluxo /app/step-up e anexado pelo stepUpInterceptor; aqui apenas disparamos o
  // PATCH e reagimos ao resultado. A decisao de seguranca permanece no backend.
  aceitar(id: string): void {
    this.aceitando.set(true);
    this.aceiteErrorMessage.set(null);
    this.contratos.registrarAceite(id).subscribe({
      next: (contrato) => {
        this.aceitando.set(false);
        this.contrato.set(contrato);
        this.versaoSelecionada.set(contrato.versaoVigente);
      },
      error: (err: HttpErrorResponse) => {
        this.aceitando.set(false);
        this.tratarErroAceite(err, id);
      },
    });
  }

  private tratarErroAceite(err: HttpErrorResponse, id: string): void {
    // 403 com MFA habilitado: step-up exigido. Coleta o token e volta a este contrato.
    if (err.status === 403 && this.auth.currentUser()?.mfaHabilitado) {
      const destino = `/app/formalizacao/contratos/${id}`;
      void this.router.navigateByUrl(`/app/step-up?next=${destino}`);
      return;
    }
    // 409: estado invalido (ex.: ja aceito). Mostra mensagem e recarrega o estado real.
    if (err.status === 409) {
      this.aceiteErrorMessage.set('O contrato nao esta mais aguardando aceite.');
      this.carregar(id);
      return;
    }
    this.aceiteErrorMessage.set(
      mensagemFormalizacaoErro(err, 'Nao foi possivel registrar o aceite.'),
    );
  }
}
