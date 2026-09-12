import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

import { AuthApi } from '../../../core/api/auth.api';
import { apiErrorMessage } from '../../../core/http/api-error.util';

/**
 * Pedido de link de redefinição de senha.
 *
 * A tela mostra sempre a mesma confirmação, exista ou não a conta. Isso é
 * deliberado e acompanha o comportamento do backend: uma resposta diferente
 * revelaria quais e-mails estão cadastrados.
 */
@Component({
  selector: 'cp-forgot-password-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MatIconModule],
  templateUrl: './forgot-password.page.html',
  styleUrl: '../auth-form.css',
})
export class ForgotPasswordPage {
  private readonly fb = inject(FormBuilder);
  private readonly authApi = inject(AuthApi);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected readonly loading = signal(false);
  protected readonly sent = signal(false);
  protected readonly errorMessage = signal('');

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    this.authApi.forgotPassword({ email: this.form.controls.email.value.trim() }).subscribe({
      next: () => {
        this.loading.set(false);
        this.sent.set(true);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.errorMessage.set(apiErrorMessage(error));
      },
    });
  }
}
