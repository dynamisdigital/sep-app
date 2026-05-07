import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';

import { ApiErrorResponse, UsuarioResponse } from '../../../../core/api/api.models';
import { UsuariosService } from '../../../../core/users/usuarios.service';

@Component({
  selector: 'sep-users-list',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './users-list.component.html',
  styleUrl: './users-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersListComponent implements OnInit {
  private readonly usuarios = inject(UsuariosService);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly usuariosList = signal<UsuarioResponse[]>([]);

  protected readonly filtroControl = new FormControl<string>('', { nonNullable: true });
  private readonly filtroSignal = toSignal(this.filtroControl.valueChanges, {
    initialValue: '',
  });

  protected readonly usuariosFiltrados = computed(() => {
    const termo = this.filtroSignal().trim().toLowerCase();
    const lista = this.usuariosList();
    if (!termo) return lista;
    return lista.filter((u) => u.username.toLowerCase().includes(termo));
  });

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.usuarios.listar().subscribe({
      next: (lista) => {
        this.usuariosList.set(lista);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        const apiErr = err.error as ApiErrorResponse | undefined;
        this.errorMessage.set(apiErr?.message ?? 'Nao foi possivel carregar os usuarios.');
        this.loading.set(false);
      },
    });
  }
}
