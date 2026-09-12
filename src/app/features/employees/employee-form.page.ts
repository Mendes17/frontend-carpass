import { Component, computed, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';

import { EmployeeApi } from '../../core/api/employee.api';
import { apiErrorMessage, apiFieldErrors } from '../../core/http/api-error.util';
import { ASSIGNABLE_ROLES, ROLE_LABELS, Role } from '../../core/models/enums.model';
import { SnackbarService } from '../../core/services/snackbar.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';

/**
 * Cadastro e edição de funcionário.
 *
 * Cadastrar alguém aqui não cria conta de acesso: são coisas separadas de
 * propósito. A maior parte da equipe de uma oficina nunca precisa entrar no
 * sistema, e o acesso é concedido depois, pela listagem, com convite por e-mail.
 * Nenhuma senha passa por esta tela.
 */
@Component({
  selector: 'cp-employee-form-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MatIconModule, PageHeaderComponent, SkeletonComponent],
  templateUrl: './employee-form.page.html',
  styleUrl: '../_shared/form-page.css',
})
export class EmployeeFormPage {
  /** Vem da rota `/equipe/:id`. Ausente significa novo cadastro. */
  readonly id = input<string | undefined>();

  private readonly fb = inject(FormBuilder);
  private readonly api = inject(EmployeeApi);
  private readonly router = inject(Router);
  private readonly snackbar = inject(SnackbarService);

  /** SYSTEM_ADMIN é papel da plataforma; o backend recusa se vier daqui. */
  protected readonly roles: { value: Role; label: string }[] = ASSIGNABLE_ROLES.map((value) => ({
    value,
    label: ROLE_LABELS[value],
  }));

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    role: ['MECHANIC' as Role, [Validators.required]],
    specialty: ['', [Validators.maxLength(120)]],
    phone: [''],
    email: ['', [Validators.email]],
  });

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly hasSystemAccess = signal(false);

  protected readonly isEdit = computed(() => !!this.id());
  protected readonly title = computed(() => (this.isEdit() ? 'Editar funcionário' : 'Novo funcionário'));

  constructor() {
    // O input de rota chega depois da construção; carregamos quando ele aparece.
    queueMicrotask(() => {
      const id = this.id();
      if (id) {
        this.loadEmployee(id);
      }
    });
  }

  private loadEmployee(id: string): void {
    this.loading.set(true);
    this.api.getById(id).subscribe({
      next: (employee) => {
        this.form.patchValue({
          name: employee.name,
          role: employee.role,
          specialty: employee.specialty ?? '',
          phone: employee.phone ?? '',
          email: employee.email ?? '',
        });
        this.hasSystemAccess.set(employee.hasSystemAccess);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.errorMessage.set(apiErrorMessage(error));
      },
    });
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');

    const value = this.form.getRawValue();
    const body = {
      name: value.name.trim(),
      role: value.role,
      specialty: value.specialty.trim() || null,
      phone: value.phone.trim() || null,
      email: value.email.trim().toLowerCase() || null,
    };

    const id = this.id();
    const request = id ? this.api.update(id, body) : this.api.create(body);

    request.subscribe({
      next: () => {
        this.snackbar.success(id ? 'Funcionário atualizado.' : 'Funcionário cadastrado.');
        void this.router.navigate(['/equipe']);
      },
      error: (error: unknown) => {
        this.saving.set(false);
        const fields = apiFieldErrors(error);
        this.errorMessage.set(fields.length ? fields[0].message : apiErrorMessage(error));
      },
    });
  }
}
