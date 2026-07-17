import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import {
  AtualizarPreferenciasPerfilRequest,
  PerfilOperacionalResponse,
} from '../../../core/api/api.models';
import { AuthService } from '../../../core/auth/auth.service';
import { ProfileService } from '../../../core/profile/profile.service';
import { OperationalShellComponent } from '../../../layout/operational-shell/operational-shell.component';

@Component({
  selector: 'sep-profile',
  imports: [OperationalShellComponent, ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent {
  private readonly auth = inject(AuthService);
  private readonly profileService = inject(ProfileService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);

  protected readonly currentUser = this.auth.currentUser;
  protected readonly profile = signal<PerfilOperacionalResponse | null>(null);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly feedbackMessage = signal<string | null>(null);
  protected readonly editing = signal(false);
  protected readonly saving = signal(false);
  protected readonly assetBase = '/image/sep_mockup_04_assets';

  protected readonly displayRole = computed(() => {
    const role = this.currentUser()?.role;
    return role ? role.charAt(0) + role.slice(1).toLocaleLowerCase('pt-BR') : '';
  });

  protected readonly preferencesForm = this.fb.nonNullable.group({
    idioma: ['', Validators.required],
    fusoHorario: ['', Validators.required],
    tema: this.fb.nonNullable.control<'ESCURO' | 'CLARO' | 'SISTEMA'>('ESCURO'),
    notificacoesAtivas: true,
    canalComunicacao: ['', Validators.required],
  });

  constructor() {
    this.loadProfile();
  }

  protected loadProfile(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.profileService
      .consultar()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (profile) => {
          this.profile.set(profile);
          this.preferencesForm.reset(profile.preferencias);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.errorMessage.set('Não foi possível carregar os dados complementares do perfil.');
        },
      });
  }

  protected startEditing(): void {
    const profile = this.profile();
    if (!profile) return;
    this.preferencesForm.reset(profile.preferencias);
    this.feedbackMessage.set(null);
    this.editing.set(true);
  }

  protected cancelEditing(): void {
    this.editing.set(false);
    this.feedbackMessage.set(null);
  }

  protected savePreferences(): void {
    if (this.preferencesForm.invalid) {
      this.preferencesForm.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const request: AtualizarPreferenciasPerfilRequest = this.preferencesForm.getRawValue();
    this.profileService
      .atualizarPreferencias(request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (profile) => {
          this.profile.set(profile);
          this.saving.set(false);
          this.editing.set(false);
          this.feedbackMessage.set('Preferências atualizadas com sucesso.');
        },
        error: () => {
          this.saving.set(false);
          this.feedbackMessage.set('Não foi possível salvar as preferências.');
        },
      });
  }

  protected copyAccountId(): void {
    const id = this.currentUser()?.id;
    if (!id) return;
    void navigator.clipboard?.writeText(id);
    this.feedbackMessage.set('ID da conta copiado.');
  }

  protected exportReport(): void {
    const user = this.currentUser();
    const profile = this.profile();
    if (!user || !profile) return;
    const blob = new Blob([JSON.stringify({ usuario: user, perfil: profile }, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `perfil-sep-${user.id}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    this.feedbackMessage.set('Relatório do perfil exportado.');
  }

  protected formatDate(value: string): string {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'medium',
    }).format(new Date(value));
  }
}
