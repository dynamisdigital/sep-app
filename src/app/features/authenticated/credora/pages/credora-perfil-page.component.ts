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
import { forkJoin } from 'rxjs';

import {
  ElegibilidadeCredoraResponse,
  EmpresaCredoraResponse,
} from '../../../../core/api/api.models';
import { CredoraService } from '../../../../core/credora/credora.service';
import { CredoraStatusComponent } from '../shared/credora-status.component';
import { ElegibilidadeStatusComponent } from '../shared/elegibilidade-status.component';
import { TIPO_CREDORA_LABEL, formatarMoeda, mensagemCredoraErro } from '../shared/credora-format';

// Perfil e elegibilidade da credora. Carrega o cadastro (GET /credores/me) e a elegibilidade
// derivada (GET /credores/me/elegibilidade) e apenas apresenta o estado retornado pelo backend: a
// tela nunca recalcula elegibilidade nem habilita interesse para credora nao elegivel. O 404 em
// /me significa que o usuario ainda nao tem credora — roteamos ao cadastro.
@Component({
  selector: 'sep-credora-perfil-page',
  imports: [RouterLink, CredoraStatusComponent, ElegibilidadeStatusComponent],
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

  // Apta a manifestar interesse: o backend so aceita interesse de credora ATIVA + ELEGIVEL. A tela
  // espelha esse gate para oferecer a navegacao, sem reimplementar a regra.
  protected readonly podeManifestarInteresse = computed(() => {
    const e = this.elegibilidade();
    return e?.status === 'ATIVA' && e?.elegibilidade === 'ELEGIVEL';
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
        this.errorMessage.set(mensagemCredoraErro(err, 'Nao foi possivel carregar o perfil.'));
      },
    });
  }
}
