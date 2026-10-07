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
import { forkJoin } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';

import {
  InteracaoResponse,
  TipoInteracao,
} from '../../../core/correspondentes/correspondentes-gestao.models';
import { CorrespondentesGestaoService } from '../../../core/correspondentes/correspondentes-gestao.service';
import { CorrespondentesService } from '../../../core/correspondentes/correspondentes.service';
import { OperationalShellComponent } from '../../../layout/operational-shell/operational-shell.component';
import {
  formatarData,
  ICONE_INTERACAO,
  ROTULO_INTERACAO,
  ROTULO_STATUS_INTERACAO,
  TOM_STATUS_INTERACAO,
} from '../correspondentes/correspondentes.format';

// Agenda e relacionamento (CORRESPONDENTE): ligacoes, WhatsApp, visitas, reunioes, retornos e
// pendencias documentais, com o historico de atendimento. Compromisso marcado e vencido vira
// "atrasado" no servidor, e a tela so exibe.
@Component({
  selector: 'sep-agenda-page',
  imports: [OperationalShellComponent, RouterLink, FormsModule, LucideAngularModule],
  templateUrl: './agenda-page.component.html',
  styleUrl: '../correspondentes/correspondentes.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgendaPageComponent implements OnInit {
  private readonly gestao = inject(CorrespondentesGestaoService);
  private readonly correspondentes = inject(CorrespondentesService);

  protected readonly interacoes = signal<InteracaoResponse[]>([]);
  protected readonly clientes = signal<string[]>([]);
  protected readonly carregando = signal(true);
  protected readonly erro = signal<string | null>(null);
  protected readonly aviso = signal<string | null>(null);

  protected readonly tipos = Object.keys(ROTULO_INTERACAO) as TipoInteracao[];
  protected readonly rotuloTipo = ROTULO_INTERACAO;
  protected readonly icone = ICONE_INTERACAO;
  protected readonly rotuloStatus = ROTULO_STATUS_INTERACAO;
  protected readonly tomStatus = TOM_STATUS_INTERACAO;
  protected readonly data = formatarData;

  protected nova = {
    clienteNome: '',
    tipo: 'LIGACAO' as TipoInteracao,
    data: '2026-10-08',
    descricao: '',
    agendar: true,
  };

  protected readonly compromissos = computed(() =>
    this.interacoes().filter((i) => i.status === 'AGENDADA' || i.status === 'ATRASADA'),
  );
  protected readonly atrasados = computed(
    () => this.interacoes().filter((i) => i.status === 'ATRASADA').length,
  );
  protected readonly historico = computed(() =>
    this.interacoes()
      .filter((i) => i.status === 'REGISTRADA' || i.status === 'CONCLUIDA')
      .reverse(),
  );
  protected readonly pendenciasDocumentais = computed(
    () => this.compromissos().filter((i) => i.tipo === 'PENDENCIA_DOCUMENTAL').length,
  );

  ngOnInit(): void {
    forkJoin({
      interacoes: this.gestao.listarInteracoes(),
      base: this.correspondentes.listarMinhaBase(),
      prospects: this.gestao.listarProspects(),
    }).subscribe({
      next: ({ interacoes, base, prospects }) => {
        this.interacoes.set(interacoes);
        const nomes = new Set([
          ...base.filter((v) => v.status === 'VIGENTE').map((v) => v.clienteNome),
          ...prospects.filter((p) => p.etapa !== 'PERDIDO').map((p) => p.nome),
        ]);
        this.clientes.set([...nomes].sort((a, b) => a.localeCompare(b)));
        this.carregando.set(false);
      },
      error: () => {
        this.erro.set('Não foi possível carregar a agenda.');
        this.carregando.set(false);
      },
    });
  }

  protected get podeSalvar(): boolean {
    return !!this.nova.clienteNome.trim() && !!this.nova.descricao.trim() && !!this.nova.data;
  }

  protected salvar(): void {
    if (!this.podeSalvar) return;
    this.erro.set(null);
    this.gestao.criarInteracao(this.nova).subscribe({
      next: (i) => {
        this.interacoes.update((l) => [...l, i].sort((a, b) => a.data.localeCompare(b.data)));
        this.aviso.set(
          this.nova.agendar
            ? `Compromisso com ${i.clienteNome} agendado para ${formatarData(i.data)}.`
            : `Atendimento de ${i.clienteNome} registrado.`,
        );
        this.nova = { ...this.nova, descricao: '' };
      },
      error: (e) => this.erro.set(e.error?.message ?? 'Não foi possível salvar.'),
    });
  }

  protected concluir(i: InteracaoResponse): void {
    this.gestao.concluirInteracao(i.id).subscribe({
      next: (c) => this.interacoes.update((l) => l.map((x) => (x.id === c.id ? c : x))),
      error: () => this.erro.set('Não foi possível concluir o compromisso.'),
    });
  }
}
