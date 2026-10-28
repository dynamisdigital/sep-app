import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { CorrespondentesGestaoService } from '../../../core/correspondentes/correspondentes-gestao.service';
import { CorrespondentesService } from '../../../core/correspondentes/correspondentes.service';
import { OperationalShellComponent } from '../../../layout/operational-shell/operational-shell.component';
import {
  baixarCsv,
  ROTULO_EVENTO_COMISSAO,
  ROTULO_ETAPA,
  ROTULO_OPERACAO,
  ROTULO_STATUS_COMISSAO,
  ROTULO_STATUS_INTERACAO,
  ROTULO_INTERACAO,
} from '../correspondentes/correspondentes.format';

interface Relatorio {
  chave: 'carteira' | 'parcelas' | 'comissoes' | 'funil' | 'agenda';
  titulo: string;
  descricao: string;
  icone: string;
  arquivo: string;
}

// Relatorios da propria carteira (CORRESPONDENTE). O arquivo e gerado no navegador com os dados que
// a API ja devolveu ao proprio correspondente, sem endpoint extra; em producao um relatorio grande
// deveria vir do backend, com a mesma regra de escopo.
@Component({
  selector: 'sep-relatorios-correspondente-page',
  imports: [OperationalShellComponent, RouterLink, LucideAngularModule],
  templateUrl: './relatorios-page.component.html',
  styleUrl: '../correspondentes/correspondentes.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RelatoriosCorrespondentePageComponent {
  private readonly correspondentes = inject(CorrespondentesService);
  private readonly gestao = inject(CorrespondentesGestaoService);

  protected readonly gerando = signal<string | null>(null);
  protected readonly aviso = signal<string | null>(null);
  protected readonly erro = signal<string | null>(null);

  protected readonly relatorios: Relatorio[] = [
    {
      chave: 'carteira',
      titulo: 'Carteira de contratos',
      descricao: 'Contratos e propostas dos seus clientes, com valor, parcela, andamento e atraso.',
      icone: 'file-check',
      arquivo: 'carteira.csv',
    },
    {
      chave: 'parcelas',
      titulo: 'Parcelas dos contratos',
      descricao: 'Todas as parcelas, com vencimento, valor, situação e dias de atraso.',
      icone: 'list-checks',
      arquivo: 'parcelas.csv',
    },
    {
      chave: 'comissoes',
      titulo: 'Comissões',
      descricao: 'Histórico de lançamentos, com base, percentual da regra e situação.',
      icone: 'wallet',
      arquivo: 'comissoes.csv',
    },
    {
      chave: 'funil',
      titulo: 'Funil de prospecção',
      descricao: 'Prospects por etapa, com valor estimado e próximo contato.',
      icone: 'funnel',
      arquivo: 'funil.csv',
    },
    {
      chave: 'agenda',
      titulo: 'Agenda e atendimentos',
      descricao: 'Compromissos e histórico de relacionamento.',
      icone: 'calendar-clock',
      arquivo: 'agenda.csv',
    },
  ];

  protected gerar(r: Relatorio): void {
    this.erro.set(null);
    this.aviso.set(null);
    this.gerando.set(r.chave);
    const concluir = () => {
      this.gerando.set(null);
      this.aviso.set(`${r.titulo}: arquivo ${r.arquivo} gerado.`);
    };
    const falhar = () => {
      this.gerando.set(null);
      this.erro.set('Não foi possível gerar o relatório.');
    };

    switch (r.chave) {
      case 'carteira':
        this.correspondentes.listarMinhasOperacoes().subscribe({
          next: (ops) => {
            baixarCsv(
              r.arquivo,
              [
                'Cliente',
                'Número',
                'Tipo',
                'Produto',
                'Valor',
                'Parcela',
                'Pagas',
                'Total',
                'Em atraso (R$)',
                'Situação',
              ],
              ops.map((o) => [
                o.clienteNome,
                o.numero,
                o.tipo,
                o.produto,
                o.valorContratado,
                o.valorParcela,
                o.parcelasPagas,
                o.totalParcelas,
                o.valorEmAtraso,
                ROTULO_OPERACAO[o.situacao],
              ]),
            );
            concluir();
          },
          error: falhar,
        });
        break;
      case 'parcelas':
        this.correspondentes.listarMinhasOperacoes().subscribe({
          next: (ops) => {
            baixarCsv(
              r.arquivo,
              [
                'Cliente',
                'Contrato',
                'Parcela',
                'Vencimento',
                'Valor',
                'Situação',
                'Pago em',
                'Dias de atraso',
              ],
              ops.flatMap((o) =>
                o.parcelas.map((p) => [
                  o.clienteNome,
                  o.numero,
                  `${p.numero}/${o.totalParcelas}`,
                  p.vencimento,
                  p.valor,
                  p.status,
                  p.pagoEm ?? '',
                  p.diasAtraso,
                ]),
              ),
            );
            concluir();
          },
          error: falhar,
        });
        break;
      case 'comissoes':
        this.gestao.consultarMinhasComissoes().subscribe({
          next: (c) => {
            baixarCsv(
              r.arquivo,
              [
                'Competência',
                'Cliente',
                'Contrato',
                'Evento',
                'Base',
                'Percentual',
                'Valor',
                'Situação',
              ],
              c.lancamentos.map((l) => [
                l.competencia,
                l.clienteNome,
                l.contratoNumero,
                ROTULO_EVENTO_COMISSAO[l.evento],
                l.baseCalculo,
                l.percentual,
                l.valor,
                ROTULO_STATUS_COMISSAO[l.status],
              ]),
            );
            concluir();
          },
          error: falhar,
        });
        break;
      case 'funil':
        this.gestao.listarProspects().subscribe({
          next: (ps) => {
            baixarCsv(
              r.arquivo,
              [
                'Nome',
                'Tipo',
                'Produto',
                'Valor estimado',
                'Etapa',
                'Próximo contato',
                'Motivo da perda',
              ],
              ps.map((p) => [
                p.nome,
                p.tipoPessoa,
                p.produtoInteresse,
                p.valorEstimado,
                ROTULO_ETAPA[p.etapa],
                p.proximoContato ?? '',
                p.motivoPerda ?? '',
              ]),
            );
            concluir();
          },
          error: falhar,
        });
        break;
      case 'agenda':
        this.gestao.listarInteracoes().subscribe({
          next: (is) => {
            baixarCsv(
              r.arquivo,
              ['Data', 'Cliente', 'Tipo', 'Situação', 'Descrição'],
              is.map((i) => [
                i.data,
                i.clienteNome,
                ROTULO_INTERACAO[i.tipo],
                ROTULO_STATUS_INTERACAO[i.status],
                i.descricao,
              ]),
            );
            concluir();
          },
          error: falhar,
        });
        break;
    }
  }
}
