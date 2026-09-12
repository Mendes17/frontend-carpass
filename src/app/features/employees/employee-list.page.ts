import { Component, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';

import { EmployeeApi, EmployeeQuery } from '../../core/api/employee.api';
import { apiErrorMessage } from '../../core/http/api-error.util';
import { PageResponse, emptyPage } from '../../core/models/common.model';
import { EmployeeResponse } from '../../core/models/employee.model';
import { ASSIGNABLE_ROLES, ROLE_LABELS, Role } from '../../core/models/enums.model';
import { SnackbarService } from '../../core/services/snackbar.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { PaginatorComponent } from '../../shared/components/paginator/paginator.component';
import { SearchInputComponent } from '../../shared/components/search-input/search-input.component';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import { GrantAccessDialog } from './grant-access.dialog';

/** Equipe da oficina. */
@Component({
  selector: 'cp-employee-list-page',
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
  templateUrl: './employee-list.page.html',
  styleUrl: '../_shared/list-page.css',
})
export class EmployeeListPage {
  private readonly api = inject(EmployeeApi);
  private readonly dialog = inject(MatDialog);
  private readonly snackbar = inject(SnackbarService);
  private readonly router = inject(Router);

  protected readonly roles: { value: Role; label: string }[] = ASSIGNABLE_ROLES.map((value) => ({
    value,
    label: ROLE_LABELS[value],
  }));

  protected readonly page = signal<PageResponse<EmployeeResponse>>(emptyPage());
  protected readonly loading = signal(true);
  protected readonly query = signal<EmployeeQuery>({
    page: 0,
    size: 20,
    sort: 'name,asc',
    q: '',
    active: true,
    role: null,
  });

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
    this.query.update((current) => ({ ...current, q: term, page: 0 }));
    this.load();
  }

  protected onRoleFilter(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as Role | '';
    this.query.update((current) => ({ ...current, role: value || null, page: 0 }));
    this.load();
  }

  protected onStatusFilter(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.query.update((current) => ({ ...current, active: value === '' ? null : value === 'true', page: 0 }));
    this.load();
  }

  protected onPageChange(page: number): void {
    this.query.update((current) => ({ ...current, page }));
    this.load();
  }

  protected edit(employee: EmployeeResponse): void {
    void this.router.navigate(['/equipe', employee.id]);
  }

  protected grantAccess(employee: EmployeeResponse): void {
    this.dialog
      .open(GrantAccessDialog, {
        width: '460px',
        data: { employeeName: employee.name, suggestedEmail: employee.email },
      })
      .afterClosed()
      .subscribe((email: string | null) => {
        if (!email) {
          return;
        }
        this.api.grantAccess(employee.id, { email }).subscribe({
          next: () => {
            this.snackbar.success('Convite enviado. O funcionário define a senha pelo link.');
            this.load();
          },
          error: (error: unknown) => this.snackbar.error(apiErrorMessage(error)),
        });
      });
  }

  protected toggleStatus(employee: EmployeeResponse): void {
    if (!employee.active) {
      this.changeStatus(employee, true);
      return;
    }

    this.dialog
      .open(ConfirmDialogComponent, {
        width: '440px',
        data: {
          title: 'Desativar funcionário',
          message: employee.hasSystemAccess
            ? `${employee.name} perde o acesso ao sistema imediatamente e deixa de aparecer para atribuição de ordens de serviço. O histórico do que já executou é preservado.`
            : `${employee.name} deixa de aparecer para atribuição de ordens de serviço. O histórico do que já executou é preservado.`,
          confirmText: 'Desativar',
          cancelText: 'Cancelar',
          type: 'danger',
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) {
          this.changeStatus(employee, false);
        }
      });
  }

  private changeStatus(employee: EmployeeResponse, active: boolean): void {
    this.api.changeStatus(employee.id, active).subscribe({
      next: () => {
        this.snackbar.success(active ? 'Funcionário reativado.' : 'Funcionário desativado.');
        this.load();
      },
      error: (error: unknown) => this.snackbar.error(apiErrorMessage(error)),
    });
  }
}
