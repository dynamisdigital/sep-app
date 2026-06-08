import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { ItemFilaDetalheResponse } from '../../../../core/api/api.models';
import { AuthService } from '../../../../core/auth/auth.service';
import { BackofficeService } from '../../../../core/backoffice/backoffice.service';
import { BackofficeChipComponent } from '../shared/backoffice-chip.component';
import {
  TIPO_ENTIDADE_LABEL,
  TIPO_ITEM_FILA_LABEL,
  formatarDataHora,
  idCurto,
  mensagemBackofficeErro,
} from '../shared/backoffice-format';

const JUSTIFICATIVA_MIN = 20;
const TEXTO_MAX = 10000;

type AcaoSensivel = 'resolver' | 'ignorar';

// Detalhe e conducao do item da fila. Apresenta dados, descricao, comentarios e o resumo do
// objeto original (sem payload bruto) e permite o fluxo assistido: assumir, comentar, resolver
// e ignorar. As transicoes de estado, ownership, auditoria e o gate de step-up sao do backend;
// o componente apenas dispara as chamadas e reage ao resultado. resolver/ignorar exigem step-up
// (anexado pelo stepUpInterceptor); sem token o backend responde 403 e redirecionamos ao fluxo
// de confirmacao adicional.
@Component({
  selector: 'sep-item-fila-detail-page',
  imports: [ReactiveFormsModule, RouterLink, BackofficeChipComponent],
  templateUrl: './item-fila-detail-page.component.html',
  styleUrl: './item-fila-detail-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ItemFilaDetailPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly backoffice = inject(BackofficeService);

  protected readonly textoMax = TEXTO_MAX;
  protected readonly tipoLabel = TIPO_ITEM_FILA_LABEL;
  protected readonly entidadeLabel = TIPO_ENTIDADE_LABEL;
  protected readonly formatarDataHora = formatarDataHora;
  protected readonly idCurto = idCurto;

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly naoEncontrado = signal(false);
  protected readonly item = signal<ItemFilaDetalheResponse | null>(null);

  protected readonly acaoEmAndamento = signal(false);
  protected readonly acaoErro = signal<string | null>(null);

  // Visibilidade das acoes por status (UX); a transicao real e validada no backend (409).
  protected readonly podeAssumir = computed(() => this.item()?.status === 'ABERTO');
  protected readonly podeResolver = computed(() => this.item()?.status === 'EM_TRATAMENTO');
  protected readonly podeIgnorar = computed(() => {
    const status = this.item()?.status;
    return status === 'ABERTO' || status === 'EM_TRATAMENTO';
  });

  protected readonly comentarioForm = this.fb.nonNullable.group({
    conteudo: ['', [Validators.required, Validators.maxLength(TEXTO_MAX)]],
  });
  protected readonly resolverForm = this.fb.nonNullable.group({
    justificativa: ['', [Validators.required, Validators.minLength(JUSTIFICATIVA_MIN)]],
  });
  protected readonly ignorarForm = this.fb.nonNullable.group({
    justificativa: ['', [Validators.required, Validators.minLength(JUSTIFICATIVA_MIN)]],
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.naoEncontrado.set(true);
      return;
    }
    this.carregar(id);
  }

  assumir(): void {
    const item = this.item();
    if (!item || this.acaoEmAndamento()) {
      return;
    }
    this.iniciarAcao();
    this.backoffice.assumirItem(item.id).subscribe({
      next: () => this.aoConcluir(item.id),
      error: (err: HttpErrorResponse) => this.tratarErro(err, item.id, 'assumir'),
    });
  }

  comentar(): void {
    const item = this.item();
    if (!item || this.acaoEmAndamento()) {
      return;
    }
    if (this.comentarioForm.invalid) {
      this.comentarioForm.markAllAsTouched();
      return;
    }
    this.iniciarAcao();
    this.backoffice
      .registrarComentario(item.id, { conteudo: this.comentarioForm.controls.conteudo.value })
      .subscribe({
        next: () => {
          this.comentarioForm.reset({ conteudo: '' });
          this.aoConcluir(item.id);
        },
        error: (err: HttpErrorResponse) => this.tratarErro(err, item.id, 'comentar'),
      });
  }

  resolver(): void {
    const item = this.item();
    if (!item || this.acaoEmAndamento()) {
      return;
    }
    if (this.resolverForm.invalid) {
      this.resolverForm.markAllAsTouched();
      return;
    }
    this.iniciarAcao();
    this.backoffice
      .resolverItem(item.id, { justificativa: this.resolverForm.controls.justificativa.value })
      .subscribe({
        next: () => {
          this.resolverForm.reset({ justificativa: '' });
          this.aoConcluir(item.id);
        },
        error: (err: HttpErrorResponse) => this.tratarErro(err, item.id, 'resolver'),
      });
  }

  ignorar(): void {
    const item = this.item();
    if (!item || this.acaoEmAndamento()) {
      return;
    }
    if (this.ignorarForm.invalid) {
      this.ignorarForm.markAllAsTouched();
      return;
    }
    this.iniciarAcao();
    this.backoffice
      .ignorarItem(item.id, { justificativa: this.ignorarForm.controls.justificativa.value })
      .subscribe({
        next: () => {
          this.ignorarForm.reset({ justificativa: '' });
          this.aoConcluir(item.id);
        },
        error: (err: HttpErrorResponse) => this.tratarErro(err, item.id, 'ignorar'),
      });
  }

  private iniciarAcao(): void {
    this.acaoEmAndamento.set(true);
    this.acaoErro.set(null);
  }

  private aoConcluir(id: string): void {
    this.acaoEmAndamento.set(false);
    this.carregar(id);
  }

  private carregar(id: string): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.naoEncontrado.set(false);
    this.backoffice.consultarItem(id).subscribe({
      next: (item) => {
        this.item.set(item);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        if (err.status === 404) {
          this.naoEncontrado.set(true);
          return;
        }
        this.errorMessage.set(mensagemBackofficeErro(err, 'Nao foi possivel carregar o item.'));
      },
    });
  }

  private tratarErro(
    err: HttpErrorResponse,
    id: string,
    acao: AcaoSensivel | 'assumir' | 'comentar',
  ): void {
    this.acaoEmAndamento.set(false);
    // resolver/ignorar exigem step-up: 403 com MFA habilitado coleta o token e volta a este item.
    if (
      err.status === 403 &&
      (acao === 'resolver' || acao === 'ignorar') &&
      this.auth.currentUser()?.mfaHabilitado
    ) {
      void this.router.navigateByUrl(`/app/step-up?next=/app/backoffice/fila/${id}`);
      return;
    }
    // 409: o item mudou de estado. Mostra mensagem e recarrega a situacao real.
    if (err.status === 409) {
      this.acaoErro.set('O item mudou de estado. Recarregamos a situacao atual.');
      this.carregar(id);
      return;
    }
    this.acaoErro.set(mensagemBackofficeErro(err, 'Nao foi possivel concluir a acao.'));
  }
}
