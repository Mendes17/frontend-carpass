import { Component, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';

import { CustomerApi } from '../../core/api/customer.api';
import { apiErrorMessage } from '../../core/http/api-error.util';
import { PageQuery, PageResponse, emptyPage } from '../../core/models/common.model';
import { CustomerResponse } from '../../core/models/customer.model';
import { SnackbarService } from '../../core/services/snackbar.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { PaginatorComponent } from '../../shared/components/paginator/paginator.component';
import { SearchInputComponent } from '../../shared/components/search-input/search-input.component';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';

/** Lista de clientes da oficina. */
@Component({
  selector: 'cp-customer-list-page',
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
  templateUrl: './customer-list.page.html',
  styleUrl: '../_shared/list-page.css',
})
export class CustomerListPage {
  private readonly api = inject(CustomerApi);
  private readonly dialog = inject(MatDialog);
  private readonly snackbar = inject(SnackbarService);
  private readonly router = inject(Router);

  protected readonly page = signal<PageResponse<CustomerResponse>>(emptyPage());
  protected readonly loading = signal(true);
  /** Guarda os filtros atuais para paginar sem perder a busca. */
  protected readonly query = signal<PageQuery>({ page: 0, size: 20, sort: 'name,asc', q: '', active: true });

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.api.list(this.query()).subscribe({
      next: (result) => {
        this.page.set(result);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected onSearch(term: string): void {
    // Buscar sempre volta para a primeira página: manter a página 3 de um
    // resultado antigo mostraria uma lista vazia sem explicação.
    this.query.update((current) => ({ ...current, q: term, page: 0 }));
    this.load();
  }

  protected onStatusFilter(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    const active = value === '' ? null : value === 'true';
    this.query.update((current) => ({ ...current, active, page: 0 }));
    this.load();
  }

  protected onPageChange(page: number): void {
    this.query.update((current) => ({ ...current, page }));
    this.load();
  }

  protected edit(customer: CustomerResponse): void {
    void this.router.navigate(['/clientes', customer.id]);
  }

  protected toggleStatus(customer: CustomerResponse): void {
    if (customer.active) {
      this.confirmDeactivate(customer);
      return;
    }
    this.changeStatus(customer, true);
  }

  private confirmDeactivate(customer: CustomerResponse): void {
    this.dialog
      .open(ConfirmDialogComponent, {
        width: '420px',
        data: {
          title: 'Desativar cliente',
          message: `${customer.name} deixa de aparecer nas listas e não poderá ser usado em novas ordens de serviço. O histórico dele é preservado e você pode reativar quando quiser.`,
          confirmText: 'Desativar',
          cancelText: 'Cancelar',
          type: 'danger',
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) {
          this.changeStatus(customer, false);
        }
      });
  }

  private changeStatus(customer: CustomerResponse, active: boolean): void {
    this.api.changeStatus(customer.id, active).subscribe({
      next: () => {
        this.snackbar.success(active ? 'Cliente reativado.' : 'Cliente desativado.');
        this.load();
      },
      error: (error: unknown) => this.snackbar.error(apiErrorMessage(error)),
    });
  }

  /** Formata CPF/CNPJ salvo só com dígitos. */
  protected formatDocument(document: string | null): string {
    if (!document) {
      return '—';
    }
    if (document.length === 11) {
      return document.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    if (document.length === 14) {
      return document.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return document;
  }
}
