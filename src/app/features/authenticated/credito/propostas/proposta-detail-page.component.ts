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

import { PropostaResponse } from '../../../../core/api/api.models';
import { AuthService } from '../../../../core/auth/auth.service';
import { CreditoService } from '../../../../core/credito/credito.service';
import { mensagemCreditoErro } from '../shared/credito-error';
import { formatarData, formatarMoeda } from '../shared/credito-format';

// Status finais nao permitem novo ciclo Open Finance (backend rejeita com 422).
const STATUS_FINAIS = new Set<PropostaResponse['status']>(['APROVADA', 'REJEITADA']);

// Detalhe consolidado da proposta: dados, score do motor e ultimo parecer. A tela
// nao decide aprovacao/rejeicao — apenas reflete o estado retornado pelo backend.
@Component({
  selector: 'sep-proposta-detail-page',
  imports: [RouterLink],
  templateUrl: './proposta-detail-page.component.html',
  styleUrl: './proposta-detail-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PropostaDetailPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly credito = inject(CreditoService);
  private readonly auth = inject(AuthService);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly proposta = signal<PropostaResponse | null>(null);

  protected readonly formatarMoeda = formatarMoeda;
  protected readonly formatarData = formatarData;

  // Open Finance e opt-in do tomador dono enquanto a proposta nao esta finalizada.
  protected readonly podeIniciarOpenFinance = computed(() => {
    const proposta = this.proposta();
    const usuario = this.auth.currentUser();
    if (!proposta || !usuario) return false;
    return proposta.tomadorId === usuario.id && !STATUS_FINAIS.has(proposta.status);
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errorMessage.set('Proposta nao informada.');
      return;
    }
    this.carregar(id);
  }

  private carregar(id: string): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.credito.consultarProposta(id).subscribe({
      next: (proposta) => {
        this.proposta.set(proposta);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.errorMessage.set(mensagemCreditoErro(err, 'Nao foi possivel carregar a proposta.'));
      },
    });
  }
}
