import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';
import { apiErrorMessage } from '../../../core/http/api-error.util';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';

/** Entrada no sistema. */
@Component({
  selector: 'cp-login-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MatIconModule, LoadingComponent],
  templateUrl: './login.page.html',
  styleUrl: '../auth-form.css',
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  protected readonly loading = signal(false);
  protected readonly showPassword = signal(false);
  /** Mensagem do servidor, exibida acima do formulário. */
  protected readonly errorMessage = signal('');

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => {
        // Entrar não é o mesmo que entrar numa oficina. Com mais de um vínculo
        // falta escolher; sem nenhum, o caminho é criar a própria oficina —
        // tipicamente quem foi desligado e ainda não abriu a dele.
        if (this.auth.needsWorkshopChoice()) {
          void this.router.navigate(['/escolher-oficina']);
          return;
        }
        if (this.auth.hasNoWorkshop()) {
          void this.router.navigate(['/nova-oficina']);
          return;
        }

        // Volta para a tela que a pessoa tentou abrir antes de ser barrada.
        const redirect = this.route.snapshot.queryParamMap.get('redirect');
        void this.router.navigateByUrl(redirect || '/painel');
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.errorMessage.set(apiErrorMessage(error));
      },
    });
  }
}
