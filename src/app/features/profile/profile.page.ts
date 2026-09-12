import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

import { ProfileApi } from '../../core/api/profile.api';
import { AuthService } from '../../core/auth/auth.service';
import { apiErrorMessage } from '../../core/http/api-error.util';
import { SnackbarService } from '../../core/services/snackbar.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('newPassword')?.value;
  const confirmation = group.get('confirmation')?.value;
  return password && confirmation && password !== confirmation ? { passwordMismatch: true } : null;
}

/**
 * Conta do próprio usuário.
 *
 * A troca de senha exige a senha atual: uma sessão sequestrada não deve conseguir
 * mudar a credencial e travar o dono para fora.
 */
@Component({
  selector: 'cp-profile-page',
  standalone: true,
  imports: [ReactiveFormsModule, MatIconModule, PageHeaderComponent],
  templateUrl: './profile.page.html',
  styleUrl: './profile.page.css',
})
export class ProfilePage {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ProfileApi);
  private readonly auth = inject(AuthService);
  private readonly snackbar = inject(SnackbarService);

  protected readonly user = this.auth.user;

  protected readonly profileForm = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.maxLength(80)]],
    lastName: [''],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
  });

  protected readonly passwordForm = this.fb.nonNullable.group(
    {
      currentPassword: ['', [Validators.required]],
      newPassword: [
        '',
        [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d).+$/)],
      ],
      confirmation: ['', [Validators.required]],
    },
    { validators: passwordsMatch },
  );

  protected readonly savingProfile = signal(false);
  protected readonly savingPassword = signal(false);

  constructor() {
    const current = this.user();
    if (current) {
      this.profileForm.patchValue({
        firstName: current.firstName,
        lastName: current.lastName ?? '',
        email: current.email,
        phone: current.phone ?? '',
      });
    }
  }

  protected saveProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.savingProfile.set(true);
    const value = this.profileForm.getRawValue();

    this.api
      .update({
        firstName: value.firstName.trim(),
        lastName: value.lastName || null,
        email: value.email.trim(),
        phone: value.phone || null,
      })
      .subscribe({
        next: () => {
          // Recarrega a sessão para o nome no cabeçalho acompanhar a mudança.
          this.auth.refreshUser().subscribe();
          this.savingProfile.set(false);
          this.snackbar.success('Perfil atualizado.');
        },
        error: (error: unknown) => {
          this.savingProfile.set(false);
          this.snackbar.error(apiErrorMessage(error));
        },
      });
  }

  protected savePassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.savingPassword.set(true);
    const value = this.passwordForm.getRawValue();

    this.api
      .changePassword({ currentPassword: value.currentPassword, newPassword: value.newPassword })
      .subscribe({
        next: () => {
          this.savingPassword.set(false);
          this.passwordForm.reset();
          this.snackbar.success('Senha alterada.');
        },
        error: (error: unknown) => {
          this.savingPassword.set(false);
          this.snackbar.error(apiErrorMessage(error));
        },
      });
  }
}
