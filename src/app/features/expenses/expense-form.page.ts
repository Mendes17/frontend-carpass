import { Component, computed, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';

import { ExpenseApi } from '../../core/api/expense.api';
import { apiErrorMessage, apiFieldErrors } from '../../core/http/api-error.util';
import { ExpenseCategoryResponse } from '../../core/models/expense.model';
import { SnackbarService } from '../../core/services/snackbar.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';

/**
 * Cadastro e edição de despesa.
 *
 * <h2>A data nasce em hoje e não passa de hoje</h2>
 *
 * Quase toda despesa é lançada no dia em que acontece, então hoje é o padrão
 * certo. O teto existe porque despesa futura entraria num mês que ainda não
 * fechou e distorceria um resultado que ninguém está olhando ainda — quem
 * barra de fato é o backend; o `max` aqui só evita a viagem.
 *
 * <h2>Quem lançou não é escolhido</h2>
 *
 * O responsável sai do usuário autenticado, no servidor. Um campo aqui seria
 * um convite a atribuir o lançamento a outra pessoa.
 */
@Component({
  selector: 'cp-expense-form-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MatIconModule, PageHeaderComponent, SkeletonComponent],
  templateUrl: './expense-form.page.html',
  styleUrl: '../_shared/form-page.css',
})
export class ExpenseFormPage {
  /** Vem da rota `/despesas/:id`. Ausente significa novo lançamento. */
  readonly id = input<string | undefined>();

  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ExpenseApi);
  private readonly router = inject(Router);
  private readonly snackbar = inject(SnackbarService);

  protected readonly hoje = new Date().toISOString().slice(0, 10);

  protected readonly form = this.fb.nonNullable.group({
    description: ['', [Validators.required, Validators.maxLength(180)]],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    expenseDate: [this.hoje, [Validators.required]],
    categoryId: ['', [Validators.required]],
    notes: [''],
  });

  protected readonly categories = signal<ExpenseCategoryResponse[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly isEdit = computed(() => !!this.id());
  protected readonly title = computed(() => (this.isEdit() ? 'Editar despesa' : 'Nova despesa'));

  constructor() {
    this.api.listActiveCategories().subscribe({
      next: (lista) => this.categories.set(lista),
      error: () => this.categories.set([]),
    });

    queueMicrotask(() => {
      const id = this.id();
      if (id) {
        this.loadExpense(id);
      }
    });
  }

  private loadExpense(id: string): void {
    this.loading.set(true);
    this.api.getById(id).subscribe({
      next: (despesa) => {
        this.form.patchValue({
          description: despesa.description,
          amount: despesa.amount,
          expenseDate: despesa.expenseDate,
          categoryId: despesa.categoryId,
          notes: despesa.notes ?? '',
        });
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
    const body = {
      description: valor.description.trim(),
      // Campo numérico vazio chega como string vazia, e Number('') é zero —
      // sem esta conversão uma despesa em branco viraria R$ 0,00 e passaria
      // pela validação de obrigatório.
      amount: Number(valor.amount),
      expenseDate: valor.expenseDate,
      categoryId: valor.categoryId,
      notes: valor.notes.trim() || null,
    };

    const id = this.id();
    const requisicao = id ? this.api.update(id, body) : this.api.create(body);

    requisicao.subscribe({
      next: () => {
        this.snackbar.success(id ? 'Despesa atualizada.' : 'Despesa lançada.');
        void this.router.navigate(['/despesas']);
      },
      error: (erro: unknown) => {
        this.saving.set(false);
        const campos = apiFieldErrors(erro);
        this.errorMessage.set(campos.length ? campos[0].message : apiErrorMessage(erro));
      },
    });
  }
}
