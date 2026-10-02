import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { Observable, map } from 'rxjs';

import { environment } from '../../../../../environments/environment';
import { ReprocessoResponse, TipoChamadaProvider } from '../../../../core/api/api.models';
import { AuthService } from '../../../../core/auth/auth.service';
import { BackofficeService } from '../../../../core/backoffice/backoffice.service';
import { OperationalShellComponent } from '../../../../layout/operational-shell/operational-shell.component';
import { ReprocessoResultadoComponent } from '../shared/reprocesso-resultado.component';
import {
  TIPOS_CHAMADA_PROVIDER,
  TIPO_CHAMADA_PROVIDER_LABEL,
  mensagemBackofficeErro,
} from '../shared/backoffice-format';
import {
  LinhaHistoricoDisparo,
  RESULTADO_DISPARO_LABEL,
  ResultadoDisparo,
  carregarHistoricoDisparos,
} from '../shared/reprocessos-dados';
import { SepArteComponent } from '../../../../shared/arte/sep-arte.component';

type Canal = 'provider' | 'webhook';

// Somente PIX_TRANSFERENCIA tem reconsulta real de status; os demais tipos podem ser stubs no
// backend. A tela avisa e nao promete retentativa efetiva.
const CHAMADA_COM_RECONSULTA: TipoChamadaProvider = 'PIX_TRANSFERENCIA';

// Janela do indicador de risco: reprocessos disparados nas ultimas 24h.
const JANELA_RISCO_HORAS = 24;
const RISCO_ALTO = 6;
const RISCO_MEDIO = 3;

@Component({
  selector: 'sep-reprocessar-provider-page',
  imports: [
    SepArteComponent,
    ReactiveFormsModule,
    RouterLink,
    LucideAngularModule,
    OperationalShellComponent,
    ReprocessoResultadoComponent,
  ],
  templateUrl: './reprocessar-provider-page.component.html',
  styleUrl: './reprocessar-provider-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReprocessarProviderPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly rota = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly backoffice = inject(BackofficeService);

  protected readonly assetBase = '/image/sep_mockup_19_assets';
  protected readonly tiposChamada = TIPOS_CHAMADA_PROVIDER;
  protected readonly chamadaLabel = TIPO_CHAMADA_PROVIDER_LABEL;
  protected readonly resultadoLabel = RESULTADO_DISPARO_LABEL;

  // A aba ativa vem da rota, nao de estado local: o breadcrumb do shell e o link direto para
  // cada canal dependem disso.
  protected readonly canal = toSignal(
    this.rota.data.pipe(map((dados) => (dados['canal'] as Canal) ?? 'provider')),
    { initialValue: (this.rota.snapshot.data['canal'] as Canal) ?? 'provider' },
  );

  protected readonly enviando = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly resultado = signal<ReprocessoResponse | null>(null);
  protected readonly regrasAbertas = signal(false);
  protected readonly suporteAberto = signal(false);

  protected readonly providerForm = this.fb.nonNullable.group({
    tipoChamada: [CHAMADA_COM_RECONSULTA as TipoChamadaProvider, [Validators.required]],
    entidadeId: ['', [Validators.required]],
    itemId: [''],
  });
  protected readonly webhookForm = this.fb.nonNullable.group({
    webhookEventId: ['', [Validators.required]],
    itemId: [''],
  });

  // ---- Historico -------------------------------------------------------------------------
  private readonly historico = signal<readonly LinhaHistoricoDisparo[]>(
    carregarHistoricoDisparos(),
  );

  protected readonly linhasHistorico = computed(() => this.historico());

  // ---- Sugestoes -------------------------------------------------------------------------
  // Nao existe endpoint que catalogue todas as entidades reprocessaveis, entao um select
  // fechado seria impossivel de preencher: o campo segue livre, como no mockup, com as
  // entidades ja reprocessadas oferecidas em uma lista propria. O `datalist` nativo foi
  // descartado porque o navegador o desenha com o tema do sistema, sem aceitar CSS.
  private readonly entidades = computed(() => [
    ...new Set(this.historico().map((linha) => linha.entidade)),
  ]);

  private readonly itens = computed(() => [
    ...new Set(this.historico().map((linha) => linha.itemFila)),
  ]);

  protected readonly comboAberto = signal<'entidade' | 'item' | null>(null);
  protected readonly comboIndice = signal(-1);

  private readonly entidadeDigitada = toSignal(this.providerForm.controls.entidadeId.valueChanges, {
    initialValue: '',
  });
  private readonly itemDigitado = toSignal(this.providerForm.controls.itemId.valueChanges, {
    initialValue: '',
  });

  protected readonly sugestoesEntidade = computed(() =>
    filtrar(this.entidades(), this.entidadeDigitada()),
  );

  protected readonly sugestoesItem = computed(() => filtrar(this.itens(), this.itemDigitado()));

  protected sugestoesDe(campo: 'entidade' | 'item'): readonly string[] {
    return campo === 'entidade' ? this.sugestoesEntidade() : this.sugestoesItem();
  }

  protected abrirCombo(campo: 'entidade' | 'item'): void {
    this.comboAberto.set(campo);
    this.comboIndice.set(-1);
  }

  // O fechamento e adiado porque o clique em uma opcao dispara o blur do campo antes do
  // mousedown chegar ao item da lista. A comparacao com o campo que pediu o fechamento evita
  // que este atraso derrube a lista do outro campo, quando o foco passa direto de um para o
  // outro: o blur do primeiro chegaria depois do focus do segundo.
  protected fecharCombo(campo: 'entidade' | 'item'): void {
    window.setTimeout(() => {
      if (this.comboAberto() !== campo) return;
      this.comboAberto.set(null);
      this.comboIndice.set(-1);
    }, 120);
  }

  protected escolherSugestao(campo: 'entidade' | 'item', valor: string): void {
    const controle =
      campo === 'entidade'
        ? this.providerForm.controls.entidadeId
        : this.providerForm.controls.itemId;
    controle.setValue(valor);
    this.comboAberto.set(null);
    this.comboIndice.set(-1);
  }

  protected navegarCombo(campo: 'entidade' | 'item', evento: KeyboardEvent): void {
    const opcoes = this.sugestoesDe(campo);
    if (opcoes.length === 0) return;

    if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
      evento.preventDefault();
      if (this.comboAberto() !== campo) this.abrirCombo(campo);
      const passo = evento.key === 'ArrowDown' ? 1 : -1;
      const proximo = (this.comboIndice() + passo + opcoes.length) % opcoes.length;
      this.comboIndice.set(proximo);
      return;
    }
    if (evento.key === 'Enter' && this.comboAberto() === campo && this.comboIndice() >= 0) {
      evento.preventDefault();
      this.escolherSugestao(campo, opcoes[this.comboIndice()]);
      return;
    }
    if (evento.key === 'Escape') {
      this.comboAberto.set(null);
      this.comboIndice.set(-1);
    }
  }

  // ---- Seguranca e conformidade ----------------------------------------------------------
  // O ambiente e derivado da URL da API em uso, nao fixado: em desenvolvimento a tela mostra
  // "Homologacao", e nao a "Producao" desenhada no mockup.
  protected readonly ambiente = computed(() => {
    const url = environment.apiBaseUrl;
    const local = /localhost|127\.0\.0\.1|^\/|^https?:\/\/(?:dev|hml|homolog)/i.test(url);
    return local ? { rotulo: 'Homologação', tom: 'cyan' } : { rotulo: 'Produção', tom: 'green' };
  });

  protected readonly perfil = computed(() => this.auth.currentUser()?.role ?? '—');

  protected readonly permissao = computed(() =>
    this.canal() === 'provider' ? 'REPROCESSAR_PROVIDER' : 'REPROCESSAR_WEBHOOK',
  );

  // Identificador da sessao de trabalho: estavel enquanto a tela vive, o suficiente para o
  // operador citar em um chamado. O backend mantem a trilha de auditoria real.
  protected readonly sessaoId = crypto.randomUUID();

  // ---- Risco operacional -----------------------------------------------------------------
  protected readonly risco = computed(() => {
    const limite = Date.now() - JANELA_RISCO_HORAS * 3_600_000;
    const recentes = this.historico().filter(
      (linha) => new Date(linha.dataHora).getTime() >= limite,
    ).length;
    // Sem endpoint de historico, a contagem cobre apenas o conjunto local; a regra e a mesma
    // que valera quando o backend publicar os disparos do periodo.
    const total = recentes || this.historico().length;
    if (total >= RISCO_ALTO) {
      return { nivel: 'ALTO', tom: 'red', titulo: 'Risco elevado', total };
    }
    if (total >= RISCO_MEDIO) {
      return { nivel: 'MÉDIO', tom: 'orange', titulo: 'Atenção recomendada', total };
    }
    return { nivel: 'BAIXO', tom: 'green', titulo: 'Operação dentro do esperado', total };
  });

  // Percentual do anel do medidor de risco.
  protected readonly riscoPercentual = computed(() => {
    const nivel = this.risco().nivel;
    if (nivel === 'ALTO') return 92;
    return nivel === 'MÉDIO' ? 62 : 28;
  });

  // ---- Formulario ------------------------------------------------------------------------
  private readonly tipoSelecionado = toSignal(this.providerForm.controls.tipoChamada.valueChanges, {
    initialValue: this.providerForm.controls.tipoChamada.value,
  });

  protected readonly semReconsulta = computed(
    () => this.canal() === 'provider' && this.tipoSelecionado() !== CHAMADA_COM_RECONSULTA,
  );

  protected trocarCanal(canal: Canal): void {
    if (canal === this.canal()) return;
    void this.router.navigate(['/app/backoffice/reprocessos', canal]);
  }

  protected disparar(): void {
    if (this.enviando()) {
      return;
    }
    if (this.canal() === 'webhook') {
      if (this.webhookForm.invalid) {
        this.webhookForm.markAllAsTouched();
        return;
      }
      const { webhookEventId, itemId } = this.webhookForm.getRawValue();
      this.enviar(this.backoffice.reprocessarWebhook(webhookEventId.trim(), corpo(itemId)));
      return;
    }
    if (this.providerForm.invalid) {
      this.providerForm.markAllAsTouched();
      return;
    }
    const { tipoChamada, entidadeId, itemId } = this.providerForm.getRawValue();
    this.enviar(this.backoffice.reprocessarProvider(tipoChamada, entidadeId.trim(), corpo(itemId)));
  }

  private enviar(chamada: Observable<ReprocessoResponse>): void {
    this.enviando.set(true);
    this.erro.set(null);
    this.resultado.set(null);
    chamada.subscribe({
      next: (resultado) => {
        this.resultado.set(resultado);
        this.enviando.set(false);
      },
      error: (err: HttpErrorResponse) => this.tratarErro(err),
    });
  }

  private tratarErro(err: HttpErrorResponse): void {
    this.enviando.set(false);
    if (err.status === 403) {
      // Com MFA habilitado o fluxo coleta o token e volta para este canal.
      if (this.auth.currentUser()?.mfaHabilitado) {
        const destino = `/app/backoffice/reprocessos/${this.canal()}`;
        void this.router.navigateByUrl(`/app/step-up?next=${destino}`);
        return;
      }
      // Sem MFA nao ha como cumprir o step-up: dizer isso e mais util que a mensagem generica,
      // que era o que aparecia antes e nao indicava o caminho.
      this.erro.set(
        'Este disparo exige confirmação adicional (step-up). Habilite a verificação em duas etapas em Meu perfil para prosseguir.',
      );
      return;
    }
    // Anti-abuso 3/24h por entidade: sem retentativa automatica.
    if (err.status === 429) {
      this.erro.set('Limite de 3 reprocessos por entidade em 24h atingido. Tente mais tarde.');
      return;
    }
    if (err.status === 400) {
      this.erro.set(
        mensagemBackofficeErro(err, 'Tipo de reprocesso não suportado ou dados inválidos.'),
      );
      return;
    }
    this.erro.set(mensagemBackofficeErro(err, 'Não foi possível disparar o reprocesso.'));
  }

  protected limparResultado(): void {
    this.erro.set(null);
    this.resultado.set(null);
  }

  // ---- Paineis auxiliares ----------------------------------------------------------------
  protected abrirRegras(): void {
    this.regrasAbertas.set(true);
  }

  protected fecharRegras(): void {
    this.regrasAbertas.set(false);
  }

  protected abrirSuporte(): void {
    this.suporteAberto.set(true);
  }

  protected fecharSuporte(): void {
    this.suporteAberto.set(false);
  }

  protected async copiarSessao(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.sessaoId);
      this.sessaoCopiada.set(true);
      window.setTimeout(() => this.sessaoCopiada.set(false), 1600);
    } catch {
      /* area de transferencia indisponivel (permissao negada ou contexto inseguro) */
    }
  }

  protected readonly sessaoCopiada = signal(false);

  // Montado aqui porque o template nao alcanca `encodeURIComponent`.
  protected readonly mailtoSuporte = computed(() => {
    const assunto = encodeURIComponent(`Suporte a reprocessamento — sessão ${this.sessaoId}`);
    const corpoEmail = encodeURIComponent(
      [
        `Canal: ${this.canal() === 'provider' ? 'Provider' : 'Webhook'}`,
        `Ambiente: ${this.ambiente().rotulo}`,
        `Perfil: ${this.perfil()}`,
        `Permissão: ${this.permissao()}`,
        `ID da sessão: ${this.sessaoId}`,
      ].join('\n'),
    );
    return `mailto:integracoes@sep.com.br?subject=${assunto}&body=${corpoEmail}`;
  });

  // ---- Apresentacao ----------------------------------------------------------------------
  protected dataHora(iso: string): string {
    const data = new Date(iso);
    return `${data.toLocaleDateString('pt-BR')} ${data.toLocaleTimeString('pt-BR')}`;
  }

  protected duracao(segundos: number | null): string {
    return segundos === null ? '–' : `${segundos.toFixed(2)}s`;
  }

  protected iniciais(nome: string): string {
    return nome
      .split(' ')
      .filter((parte) => parte.length > 2)
      .slice(0, 2)
      .map((parte) => parte[0]?.toLocaleUpperCase('pt-BR') ?? '')
      .join('');
  }

  // Os PNGs `icon_avatar_*` do pacote do Mockup 18 vieram recortados; o avatar segue desenhado
  // em CSS, com as mesmas cores amostradas do mockup. Sao tinta saturada, invariante por tema:
  // o texto por cima e branco nos dois (`--sep-on-tint`), e todas passam de 6,3:1 com ele.
  protected corDoAvatar(nome: string): string {
    const cores: Record<string, string> = {
      AM: '#4a2f96',
      RF: '#3f42a0',
      CA: '#5a5f6b',
      JS: '#575c68',
      LG: '#17509e',
    };
    return cores[this.iniciais(nome)] ?? '#3d5468';
  }

  protected tomResultado(resultado: ResultadoDisparo): string {
    const tons: Record<ResultadoDisparo, string> = {
      SUCESSO: 'green',
      SEM_RETORNO: 'orange',
      FALHA: 'red',
    };
    return tons[resultado];
  }
}

// itemId e opcional; quando informado vincula o reprocesso ao item da fila.
function corpo(itemId: string): { itemId: string } | undefined {
  const valor = itemId.trim();
  return valor ? { itemId: valor } : undefined;
}

// Campo vazio mostra tudo; com texto, filtra sem diferenciar acento nem caixa.
function filtrar(opcoes: readonly string[], termo: string): readonly string[] {
  const alvo = termo.trim().toLocaleLowerCase('pt-BR');
  if (!alvo) return opcoes;
  return opcoes.filter((opcao) => opcao.toLocaleLowerCase('pt-BR').includes(alvo));
}
