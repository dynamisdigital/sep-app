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
  AcaoAuditoria,
  EventoAuditoria,
} from '../../../core/correspondentes/correspondentes-gestao.models';
import { CorrespondentesGestaoService } from '../../../core/correspondentes/correspondentes-gestao.service';
import { OperationalShellComponent } from '../../../layout/operational-shell/operational-shell.component';
import { baixarCsv, formatarDataHora, ROTULO_ACAO_AUDITORIA } from './correspondentes.format';

// Auditoria do modulo (ADMIN): quem fez o que e quando, com os valores. O registro e imutavel e
// gravado pelo backend; a tela so le, filtra e exporta.
@Component({
  selector: 'sep-auditoria-correspondentes-page',
  imports: [OperationalShellComponent, RouterLink, FormsModule, LucideAngularModule],
  templateUrl: './auditoria-page.component.html',
  styleUrl: './correspondentes.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditoriaPageComponent implements OnInit {
  private readonly service = inject(CorrespondentesGestaoService);

  protected readonly eventos = signal<EventoAuditoria[]>([]);
  protected readonly carregando = signal(true);
  protected readonly erro = signal<string | null>(null);

  protected readonly filtroAtor = signal('');
  protected readonly filtroAcao = signal<AcaoAuditoria | ''>('');

  protected readonly rotulo = ROTULO_ACAO_AUDITORIA;
  protected readonly acoes = Object.keys(ROTULO_ACAO_AUDITORIA) as AcaoAuditoria[];
  protected readonly dataHora = formatarDataHora;

  protected readonly visiveis = computed(() => {
    const ator = this.filtroAtor().trim().toLowerCase();
    const acao = this.filtroAcao();
    return this.eventos().filter(
      (e) => (!ator || e.ator.toLowerCase().includes(ator)) && (!acao || e.acao === acao),
    );
  });

  ngOnInit(): void {
    this.service.listarAuditoria().subscribe({
      next: (e) => {
        this.eventos.set(e);
        this.carregando.set(false);
      },
      error: () => {
        this.erro.set('Não foi possível carregar a auditoria.');
        this.carregando.set(false);
      },
    });
  }

  protected exportar(): void {
    baixarCsv(
      'auditoria-correspondentes.csv',
      ['Quando', 'Autor', 'Papel', 'Ação', 'Entidade', 'Identificador', 'Detalhe'],
      this.visiveis().map((e) => [
        e.quando,
        e.ator,
        e.papel,
        ROTULO_ACAO_AUDITORIA[e.acao],
        e.entidade,
        e.entidadeId,
        e.detalhe,
      ]),
    );
  }
}
