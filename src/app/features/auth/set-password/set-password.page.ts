import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthApi } from '../../../core/api/auth.api';
import { apiErrorMessage } from '../../../core/http/api-error.util';
import { SnackbarService } from '../../../core/services/snackbar.service';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('newPassword')?.value;
  const confirmation = group.get('confirmation')?.value;
  return password && confirmation && password !== confirmation ? { passwordMismatch: true } : null;
}

/**
 * Define a senha a partir do link recebido por e-mail.
 *
 * Serve para os dois fluxos que usam o mesmo token: recuperar a senha esquecida e
 * o primeiro acesso de um funcionário recém-cadastrado.
 */
@Component({
  selector: 'cp-set-password-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MatIconModule],
  templateUrl: './set-password.page.html',
  styleUrl: '../auth-form.css',
})
export class SetPasswordPage {
  private readonly fb = inject(FormBuilder);
  private readonly authApi = inject(AuthApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackbar = inject(SnackbarService);

  /** Token que veio na URL do e-mail. */
  protected readonly token = this.route.snapshot.queryParamMap.get('token') ?? '';

  protected readonly form = this.fb.nonNullable.group(
    {
      newPassword: [
        '',
        [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d).+$/)],
      ],
      confirmation: ['', [Validators.required]],
    },
    { validators: passwordsMatch },
  );

  protected readonly loading = signal(false);
  protected readonly showPassword = signal(false);
  protected readonly errorMessage = signal('');

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    this.authApi
      .resetPassword({ token: this.token, newPassword: this.form.controls.newPassword.value })
      .subscribe({
        next: () => {
          this.snackbar.success('Senha definida. Faça login com a nova senha.');
          void this.router.navigate(['/entrar']);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.errorMessage.set(apiErrorMessage(error));
        },
      });
  }
}
