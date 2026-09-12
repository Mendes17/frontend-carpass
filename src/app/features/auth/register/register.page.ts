import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';

import { AuthApi } from '../../../core/api/auth.api';
import { apiErrorMessage } from '../../../core/http/api-error.util';
import { SnackbarService } from '../../../core/services/snackbar.service';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';

/** Confere se as duas senhas digitadas batem. */
function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirmation = group.get('passwordConfirmation')?.value;
  return password && confirmation && password !== confirmation ? { passwordMismatch: true } : null;
}

/**
 * Cadastro inicial: cria a oficina e o usuário proprietário de uma vez.
 *
 * É o único caminho público para criar conta. Os demais usuários da oficina são
 * criados por dentro, por quem já tem acesso.
 */
@Component({
  selector: 'cp-register-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MatIconModule, LoadingComponent],
  templateUrl: './register.page.html',
  styleUrl: '../auth-form.css',
})
export class RegisterPage {
  private readonly fb = inject(FormBuilder);
  private readonly authApi = inject(AuthApi);
  private readonly router = inject(Router);
  private readonly snackbar = inject(SnackbarService);

  protected readonly form = this.fb.nonNullable.group(
    {
      tradeName: ['', [Validators.required, Validators.maxLength(150)]],
      cnpj: ['', [Validators.required, Validators.pattern(/^\d{14}$/)]],
      workshopPhone: [''],
      firstName: ['', [Validators.required, Validators.maxLength(80)]],
      lastName: [''],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      password: [
        '',
        [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d).+$/)],
      ],
      passwordConfirmation: ['', [Validators.required]],
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

    const value = this.form.getRawValue();

    this.authApi
      .registerWorkshop({
        tradeName: value.tradeName.trim(),
        // O backend guarda o CNPJ só com dígitos; tiramos a máscara aqui.
        cnpj: value.cnpj.replace(/\D/g, ''),
        workshopPhone: value.workshopPhone || null,
        firstName: value.firstName.trim(),
        lastName: value.lastName || null,
        email: value.email.trim(),
        phone: value.phone || null,
        password: value.password,
      })
      .subscribe({
        next: () => {
          this.snackbar.success('Oficina cadastrada. Faça login para começar.');
          void this.router.navigate(['/entrar']);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.errorMessage.set(apiErrorMessage(error));
        },
      });
  }
}
