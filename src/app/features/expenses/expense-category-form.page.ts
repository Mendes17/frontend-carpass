import { Component, computed, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';

import { ExpenseApi } from '../../core/api/expense.api';
import { apiErrorMessage, apiFieldErrors } from '../../core/http/api-error.util';
import { SnackbarService } from '../../core/services/snackbar.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';

/** Cadastro e edição de categoria de despesa. */
@Component({
  selector: 'cp-expense-category-form-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MatIconModule, PageHeaderComponent, SkeletonComponent],
  templateUrl: './expense-category-form.page.html',
  styleUrl: '../_shared/form-page.css',
})
export class ExpenseCategoryFormPage {
  /** Vem da rota `/despesas/categorias/:id`. Ausente significa nova categoria. */
  readonly id = input<string | undefined>();

  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ExpenseApi);
  private readonly router = inject(Router);
  private readonly snackbar = inject(SnackbarService);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(80)]],
    description: [''],
  });

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly isEdit = computed(() => !!this.id());
  protected readonly title = computed(() => (this.isEdit() ? 'Editar categoria' : 'Nova categoria'));

  constructor() {
    queueMicrotask(() => {
      const id = this.id();
      if (id) {
        this.loadCategory(id);
      }
    });
  }

  private loadCategory(id: string): void {
    this.loading.set(true);
    this.api.getCategoryById(id).subscribe({
      next: (categoria) => {
        this.form.patchValue({ name: categoria.name, description: categoria.description ?? '' });
        this.loading.set(false);
      },
      error: (erro: unknown) => {
        this.loading.set(false);
        this.errorMessage.set(apiErrorMessage(erro));
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

    const valor = this.form.getRawValue();
    const body = { name: valor.name.trim(), description: valor.description.trim() || null };

    const id = this.id();
    const requisicao = id ? this.api.updateCategory(id, body) : this.api.createCategory(body);

    requisicao.subscribe({
      next: () => {
        this.snackbar.success(id ? 'Categoria atualizada.' : 'Categoria cadastrada.');
        void this.router.navigate(['/despesas/categorias']);
      },
      error: (erro: unknown) => {
        this.saving.set(false);
        const campos = apiFieldErrors(erro);
        this.errorMessage.set(campos.length ? campos[0].message : apiErrorMessage(erro));
      },
    });
  }
}
