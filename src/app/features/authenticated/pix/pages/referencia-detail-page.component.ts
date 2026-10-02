import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import {
  PixReferenciaRecebimentoResponse,
  StatusPixReferenciaRecebimento,
} from '../../../../core/api/api.models';
import { AuthService } from '../../../../core/auth/auth.service';
import { PixService } from '../../../../core/pix/pix.service';
import { OperationalShellComponent } from '../../../../layout/operational-shell/operational-shell.component';
import {
  STATUS_REFERENCIA_LABEL,
  formatarMoeda,
  idCurto,
  mensagemPixErro,
} from '../shared/pix-format';

type TomStatus = 'green' | 'orange' | 'red';

const TOM_REFERENCIA: Record<StatusPixReferenciaRecebimento, TomStatus> = {
  ATIVA: 'green',
  PAGA: 'green',
  EXPIRADA: 'red',
  CANCELADA: 'red',
  DIVERGENTE: 'red',
};

// Detalhe de uma referência Pix de recebimento (Mockup 26).
@Component({
  selector: 'sep-referencia-detail-page',
  imports: [RouterLink, LucideAngularModule, OperationalShellComponent],
  templateUrl: './referencia-detail-page.component.html',
  styleUrl: './referencia-detail-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReferenciaDetailPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly pix = inject(PixService);
  private readonly auth = inject(AuthService);

  private id = '';

  protected readonly loading = signal(false);
  protected readonly naoEncontrada = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly referencia = signal<PixReferenciaRecebimentoResponse | null>(null);
  protected readonly copiado = signal<string | null>(null);
  protected readonly menuAberto = signal(false);

  protected readonly formatarMoeda = formatarMoeda;
  protected readonly idCurto = idCurto;

  protected readonly statusTom = computed<TomStatus>(() => {
    const r = this.referencia();
    return r ? (TOM_REFERENCIA[r.status] ?? 'green') : 'green';
  });

  protected readonly statusRotulo = computed(() => {
    const r = this.referencia();
    return r ? (STATUS_REFERENCIA_LABEL[r.status] ?? r.status) : 'ATIVA';
  });

  // Apenas FINANCEIRO/ADMIN acessam a parcela financeira na cobrança
  protected readonly podeVerParcela = computed(() => {
    const role = this.auth.currentUser()?.role;
    return role === 'FINANCEIRO' || role === 'ADMIN';
  });

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id') ?? '';
    if (this.id) {
      this.carregar();
    }
  }

  carregar(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.naoEncontrada.set(false);
    this.pix.consultarReferenciaRecebimento(this.id).subscribe({
      next: (referencia) => {
        this.referencia.set(referencia);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        if (err.status === 404) {
          this.naoEncontrada.set(true);
          return;
        }
        this.errorMessage.set(mensagemPixErro(err, 'Não foi possível carregar a referência Pix.'));
      },
    });
  }

  copiar(valor: string | undefined | null, chave: string): void {
    if (!valor) return;
    void navigator.clipboard?.writeText(valor);
    this.copiado.set(chave);
    window.setTimeout(() => this.copiado.set(null), 1600);
  }

  alternarMenu(): void {
    this.menuAberto.update((v) => !v);
  }

  irPara(rota: string): void {
    this.menuAberto.set(false);
    void this.router.navigate([rota]);
  }

  abrirRecebimento(recebimentoId: string): void {
    void this.router.navigate(['/app/pix/recebimentos', recebimentoId]);
  }

  texto(valor: string | undefined | null): string {
    if (!valor) return '—';
    return valor;
  }

  dataHora(iso: string | undefined | null): string {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(d);
    } catch {
      return iso;
    }
  }

  moeda(valor: number | undefined | null): string {
    if (valor === undefined || valor === null) return '—';
    return formatarMoeda(valor);
  }

  diferencaValor(esperado: number | undefined, recebido: number | undefined): number {
    const esp = esperado ?? 0;
    const rec = recebido ?? 0;
    return esp - rec;
  }
}
