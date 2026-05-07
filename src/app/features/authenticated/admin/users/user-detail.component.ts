import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { ApiErrorResponse, UsuarioResponse } from '../../../../core/api/api.models';
import { UsuariosService } from '../../../../core/users/usuarios.service';

@Component({
  selector: 'sep-user-detail',
  imports: [RouterLink],
  templateUrl: './user-detail.component.html',
  styleUrl: './user-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly usuarios = inject(UsuariosService);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly usuario = signal<UsuarioResponse | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errorMessage.set('Identificador do usuario nao informado.');
      return;
    }

    this.loading.set(true);
    this.usuarios.buscarPorId(id).subscribe({
      next: (u) => {
        this.usuario.set(u);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        const apiErr = err.error as ApiErrorResponse | undefined;
        this.errorMessage.set(apiErr?.message ?? 'Nao foi possivel carregar o usuario.');
        this.loading.set(false);
      },
    });
  }
}
