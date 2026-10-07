import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import {
  EtapaFunil,
  ETAPAS_FUNIL,
  ProspectResponse,
} from '../../../core/correspondentes/correspondentes-gestao.models';
import { CorrespondentesGestaoService } from '../../../core/correspondentes/correspondentes-gestao.service';
import { OperationalShellComponent } from '../../../layout/operational-shell/operational-shell.component';
import {
  formatarData,
  formatarMoeda,
  formatarPercentual,
  moedaCurta,
  ROTULO_ETAPA,
} from '../correspondentes/correspondentes.format';

// Funil de prospeccao (CORRESPONDENTE): do prospectado ao cliente ativo. O correspondente organiza
// o que ainda nao virou contrato; a analise de credito e a aprovacao seguem sendo do SEP, entao o
// avancar de etapa e um registro comercial, e nao uma decisao.
@Component({
  selector: 'sep-prospeccao-page',
  imports: [OperationalShellComponent, RouterLink, FormsModule, LucideAngularModule],
  templateUrl: './prospeccao-page.component.html',
  styleUrl: '../correspondentes/correspondentes.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProspeccaoPageComponent implements OnInit {
  private readonly service = inject(CorrespondentesGestaoService);

  protected readonly prospects = signal<ProspectResponse[]>([]);
  protected readonly carregando = signal(true);
  protected readonly erro = signal<string | null>(null);
  protected readonly aviso = signal<string | null>(null);
  protected readonly perdendo = signal<string | null>(null);
  protected motivoPerda = '';

  protected readonly etapas = ETAPAS_FUNIL;
  protected readonly rotulo = ROTULO_ETAPA;
  protected readonly data = formatarData;
  protected readonly moeda = formatarMoeda;
  protected readonly moedaCurta = moedaCurta;

  protected novo = {
    nome: '',
    tipoPessoa: 'PJ' as 'PF' | 'PJ',
    telefone: '',
    produtoInteresse: 'Capital de giro',
    valorEstimado: 0,
  };

  protected readonly porEtapa = computed(() => {
    const mapa = new Map<EtapaFunil, ProspectResponse[]>();
    for (const e of [...ETAPAS_FUNIL, 'PERDIDO' as EtapaFunil]) mapa.set(e, []);
    for (const p of this.prospects()) mapa.get(p.etapa)?.push(p);
    return mapa;
  });

  protected readonly emAndamento = computed(() =>
    this.prospects().filter((p) => p.etapa !== 'PERDIDO' && p.etapa !== 'ATIVO'),
  );
  protected readonly valorEmAndamento = computed(() =>
    this.emAndamento().reduce((t, p) => t + p.valorEstimado, 0),
  );
  protected readonly conversao = computed(() => {
    const total = this.prospects().length;
    const ganhos = this.prospects().filter(
      (p) => p.etapa === 'CONTRATADO' || p.etapa === 'ATIVO',
    ).length;
    return total ? Math.round((ganhos / total) * 1000) / 10 : 0;
  });
  protected readonly perdidos = computed(
    () => this.prospects().filter((p) => p.etapa === 'PERDIDO').length,
  );

  protected readonly pct = formatarPercentual;

  ngOnInit(): void {
    this.service.listarProspects().subscribe({
      next: (p) => {
        this.prospects.set(p);
        this.carregando.set(false);
      },
      error: () => {
        this.erro.set('Não foi possível carregar o funil.');
        this.carregando.set(false);
      },
    });
  }

  protected get podeCriar(): boolean {
    return !!this.novo.nome.trim() && this.novo.valorEstimado > 0;
  }

  protected criar(): void {
    if (!this.podeCriar) return;
    this.erro.set(null);
    this.service.criarProspect(this.novo).subscribe({
      next: (p) => {
        this.prospects.update((l) => [p, ...l]);
        this.aviso.set(`${p.nome} entrou no funil como prospectado.`);
        this.novo = { ...this.novo, nome: '', telefone: '', valorEstimado: 0 };
      },
      error: (e) => this.erro.set(e.error?.message ?? 'Não foi possível cadastrar o prospect.'),
    });
  }

  protected proxima(etapa: EtapaFunil): EtapaFunil | null {
    const i = ETAPAS_FUNIL.indexOf(etapa);
    return i >= 0 && i < ETAPAS_FUNIL.length - 1 ? ETAPAS_FUNIL[i + 1] : null;
  }

  protected avancar(p: ProspectResponse): void {
    const prox = this.proxima(p.etapa);
    if (prox) this.mover(p, prox);
  }

  protected iniciarPerda(p: ProspectResponse): void {
    this.perdendo.set(p.id);
    this.motivoPerda = '';
  }

  protected confirmarPerda(p: ProspectResponse): void {
    if (!this.motivoPerda.trim()) return;
    this.mover(p, 'PERDIDO', this.motivoPerda);
    this.perdendo.set(null);
  }

  private mover(p: ProspectResponse, etapa: EtapaFunil, motivoPerda?: string): void {
    this.erro.set(null);
    this.service.moverEtapa(p.id, { etapa, motivoPerda }).subscribe({
      next: (atualizado) => {
        this.prospects.update((l) => l.map((x) => (x.id === atualizado.id ? atualizado : x)));
        this.aviso.set(`${atualizado.nome}: ${ROTULO_ETAPA[etapa]}.`);
      },
      error: (e) => this.erro.set(e.error?.message ?? 'Não foi possível mover o prospect.'),
    });
  }
}
