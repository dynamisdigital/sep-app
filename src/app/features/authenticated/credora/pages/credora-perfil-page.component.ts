import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { forkJoin } from 'rxjs';

import {
  ElegibilidadeCredoraResponse,
  EmpresaCredoraResponse,
} from '../../../../core/api/api.models';
import { CredoraService } from '../../../../core/credora/credora.service';
import { OperationalShellComponent } from '../../../../layout/operational-shell/operational-shell.component';
import { TIPO_CREDORA_LABEL, formatarMoeda, mensagemCredoraErro } from '../shared/credora-format';

interface Situacao {
  tom: 'green' | 'amber' | 'red' | 'blue';
  icone: string;
  titulo: string;
  mensagem: string;
}

// Perfil e elegibilidade da credora. Carrega o cadastro (GET /credores/me) e a elegibilidade
// derivada (GET /credores/me/elegibilidade) e apenas apresenta o estado retornado pelo backend:
// a tela nunca recalcula elegibilidade nem habilita interesse para credora nao elegivel. O 404
// em /me significa que o usuario ainda nao tem credora — roteamos ao cadastro.
//
// Esta tela nao tem desenho na serie de mockups: nasce do resultado do cadastro (Mockup 36) e
// foi construida no padrao visual do tema. A referencia em `image/mockups` e uma captura da
// propria implementacao, nao arte de designer.
@Component({
  selector: 'sep-credora-perfil-page',
  imports: [RouterLink, LucideAngularModule, OperationalShellComponent],
  templateUrl: './credora-perfil-page.component.html',
  styleUrl: './credora-perfil-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CredoraPerfilPageComponent implements OnInit {
  private readonly credora = inject(CredoraService);
  private readonly router = inject(Router);

  protected readonly tipoLabel = TIPO_CREDORA_LABEL;
  protected readonly formatarMoeda = formatarMoeda;

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly empresa = signal<EmpresaCredoraResponse | null>(null);
  protected readonly elegibilidade = signal<ElegibilidadeCredoraResponse | null>(null);

  // Apta a manifestar interesse: o backend so aceita interesse de credora ATIVA + ELEGIVEL.
  // A tela espelha esse gate para oferecer a navegacao, sem reimplementar a regra.
  protected readonly podeManifestarInteresse = computed(() => {
    const e = this.elegibilidade();
    return e?.status === 'ATIVA' && e?.elegibilidade === 'ELEGIVEL';
  });

  // Um estado por vez, na ordem em que o backend os torna verdadeiros.
  protected readonly situacao = computed<Situacao | null>(() => {
    const e = this.elegibilidade();
    if (!e) return null;
    if (e.elegibilidade === 'INELEGIVEL') {
      return {
        tom: 'red',
        icone: 'triangle-alert',
        titulo: 'Credora inelegível',
        mensagem: 'Sua credora está inelegível e não pode manifestar interesse em oportunidades.',
      };
    }
    if (e.status === 'SUSPENSA') {
      return {
        tom: 'amber',
        icone: 'triangle-alert',
        titulo: 'Credora suspensa',
        mensagem: 'Sua credora está suspensa e não pode manifestar interesse no momento.',
      };
    }
    if (e.elegibilidade === 'PENDENTE') {
      return {
        tom: 'blue',
        icone: 'clock',
        titulo: 'Elegibilidade em análise',
        mensagem:
          'Você será habilitado a manifestar interesse quando o backend concluir a verificação do onboarding.',
      };
    }
    if (this.podeManifestarInteresse()) {
      return {
        tom: 'green',
        icone: 'circle-check',
        titulo: 'Apta a investir',
        mensagem: 'Sua credora está apta a manifestar interesse em oportunidades disponíveis.',
      };
    }
    return {
      tom: 'blue',
      icone: 'clock',
      titulo: 'Ativação em processamento',
      mensagem:
        'Seu cadastro foi concluído. Você será habilitado a manifestar interesse após a ativação.',
    };
  });

  protected readonly statusTom = computed<'green' | 'amber' | 'red'>(() => {
    const status = this.empresa()?.status;
    if (status === 'ATIVA') return 'green';
    if (status === 'SUSPENSA') return 'amber';
    return status === 'CADASTRADA' ? 'amber' : 'red';
  });

  protected readonly elegibilidadeTom = computed<'green' | 'amber' | 'red'>(() => {
    const valor = this.elegibilidade()?.elegibilidade;
    if (valor === 'ELEGIVEL') return 'green';
    if (valor === 'PENDENTE') return 'amber';
    return 'red';
  });

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    forkJoin({
      empresa: this.credora.consultarMinhaCredora(),
      elegibilidade: this.credora.consultarElegibilidade(),
    }).subscribe({
      next: ({ empresa, elegibilidade }) => {
        this.empresa.set(empresa);
        this.elegibilidade.set(elegibilidade);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        if (err.status === 404) {
          void this.router.navigate(['/app/credora/cadastro']);
          return;
        }
        this.errorMessage.set(mensagemCredoraErro(err, 'Não foi possível carregar o perfil.'));
      },
    });
  }

  texto(valor: string | null | undefined): string {
    return valor ? valor : '—';
  }

  data(iso: string | null | undefined): string {
    if (!iso) return '—';
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
      new Date(iso),
    );
  }
}
