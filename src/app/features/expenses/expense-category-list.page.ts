import { Component, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';

import { ExpenseApi } from '../../core/api/expense.api';
import { apiErrorMessage } from '../../core/http/api-error.util';
import { PageQuery, PageResponse, emptyPage } from '../../core/models/common.model';
import { ExpenseCategoryResponse } from '../../core/models/expense.model';
import { SnackbarService } from '../../core/services/snackbar.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { PaginatorComponent } from '../../shared/components/paginator/paginator.component';
import { SearchInputComponent } from '../../shared/components/search-input/search-input.component';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';

/**
 * Categorias de despesa.
 *
 * Fica sob `/despesas/categorias` e não no menu principal: é cadastro de apoio,
 * e quem procura por ele está pensando em despesa, não em configuração.
 */
@Component({
  selector: 'cp-expense-category-list-page',
  standalone: true,
  imports: [
    RouterLink,
    MatIconModule,
    PageHeaderComponent,
    SearchInputComponent,
    PaginatorComponent,
    EmptyStateComponent,
    SkeletonComponent,
  ],
  templateUrl: './expense-category-list.page.html',
  styleUrl: '../_shared/list-page.css',
})
export class ExpenseCategoryListPage {
  private readonly api = inject(ExpenseApi);
  private readonly dialog = inject(MatDialog);
  private readonly snackbar = inject(SnackbarService);
  private readonly router = inject(Router);

  protected readonly page = signal<PageResponse<ExpenseCategoryResponse>>(emptyPage());
  protected readonly loading = signal(true);
  protected readonly query = signal<PageQuery>({
    page: 0,
    size: 20,
    sort: 'name,asc',
    q: '',
    active: true,
  });

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.api.listCategories(this.query()).subscribe({
      next: (resultado) => {
        this.page.set(resultado);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected onSearch(term: string): void {
    this.query.update((atual) => ({ ...atual, q: term, page: 0 }));
    this.load();
  }

  protected onStatusFilter(event: Event): void {
    const valor = (event.target as HTMLSelectElement).value;
    this.query.update((atual) => ({ ...atual, active: valor === '' ? null : valor === 'true', page: 0 }));
    this.load();
  }

  protected onPageChange(page: number): void {
    this.query.update((atual) => ({ ...atual, page }));
    this.load();
  }

  protected edit(categoria: ExpenseCategoryResponse): void {
    void this.router.navigate(['/despesas/categorias', categoria.id]);
  }

  /**
   * Desativar diz quantos lançamentos deixam de ser oferecidos por aquela via.
   *
   * A categoria nunca é apagada: a despesa aponta para ela, e apagar quebraria
   * o histórico de todo mês que a usou.
   */
  protected toggleStatus(categoria: ExpenseCategoryResponse): void {
    if (!categoria.active) {
      this.changeStatus(categoria, true);
      return;
    }

    const emUso =
      categoria.expenseCount === 0
        ? 'Nenhuma despesa usa esta categoria hoje.'
        : categoria.expenseCount === 1
          ? 'Uma despesa continua nesta categoria e segue contando no financeiro.'
          : `${categoria.expenseCount} despesas continuam nesta categoria e seguem contando no financeiro.`;

    this.dialog
      .open(ConfirmDialogComponent, {
        width: '460px',
        data: {
          title: 'Desativar categoria',
          message: `"${categoria.name}" deixa de aparecer ao lançar novas despesas. ${emUso}`,
          confirmText: 'Desativar',
          cancelText: 'Cancelar',
          type: 'danger',
        },
      })
      .afterClosed()
      .subscribe((confirmado) => {
        if (confirmado) {
          this.changeStatus(categoria, false);
        }
      });
  }

  private changeStatus(categoria: ExpenseCategoryResponse, active: boolean): void {
    this.api.changeCategoryStatus(categoria.id, active).subscribe({
      next: () => {
        this.snackbar.success(active ? 'Categoria reativada.' : 'Categoria desativada.');
        this.load();
      },
      error: (erro: unknown) => this.snackbar.error(apiErrorMessage(erro)),
    });
  }
}
