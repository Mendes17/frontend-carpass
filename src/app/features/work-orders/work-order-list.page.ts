import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';

import { EmployeeApi } from '../../core/api/employee.api';
import { WorkOrderApi } from '../../core/api/work-order.api';
import { PageResponse, emptyPage } from '../../core/models/common.model';
import { EmployeeResponse } from '../../core/models/employee.model';
import {
  QUOTE_STATUS_TONES,
  WORK_ORDER_STATUS_FLOW,
  WORK_ORDER_STATUS_LABELS,
  WORK_ORDER_STATUS_TONES,
  WorkOrderStatus,
} from '../../core/models/enums.model';
import { WorkOrderQuery, WorkOrderSummary } from '../../core/models/work-order.model';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { PaginatorComponent } from '../../shared/components/paginator/paginator.component';
import { SearchInputComponent } from '../../shared/components/search-input/search-input.component';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';

/** Ordens de serviço da oficina. */
@Component({
  selector: 'cp-work-order-list-page',
  standalone: true,
  imports: [
    RouterLink,
    CurrencyPipe,
    DatePipe,
    MatIconModule,
    PageHeaderComponent,
    SearchInputComponent,
    PaginatorComponent,
    EmptyStateComponent,
    SkeletonComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './work-order-list.page.html',
  styleUrls: ['../_shared/list-page.css', './work-order-list.page.css'],
})
export class WorkOrderListPage {
  private readonly api = inject(WorkOrderApi);
  private readonly employeeApi = inject(EmployeeApi);
  private readonly router = inject(Router);

  /** Na ordem do fluxo da oficina, não em ordem alfabética. */
  protected readonly statuses = WORK_ORDER_STATUS_FLOW.map((value) => ({
    value,
    label: WORK_ORDER_STATUS_LABELS[value],
  }));

  protected readonly mechanics = signal<EmployeeResponse[]>([]);
  protected readonly page = signal<PageResponse<WorkOrderSummary>>(emptyPage());
  protected readonly loading = signal(true);
  protected readonly query = signal<WorkOrderQuery>({
    page: 0,
    size: 20,
    sort: 'openedAt,desc',
    q: '',
    status: null,
    mechanicId: null,
  });

  protected readonly statusTone = WORK_ORDER_STATUS_TONES;
  protected readonly quoteTone = QUOTE_STATUS_TONES;

  constructor() {
    this.load();
    this.employeeApi.mechanics().subscribe({
      next: (list) => this.mechanics.set(list),
      error: () => this.mechanics.set([]),
    });
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

  protected onStatusFilter(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as WorkOrderStatus | '';
    this.query.update((current) => ({ ...current, status: value || null, page: 0 }));
    this.load();
  }

  protected onMechanicFilter(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.query.update((current) => ({ ...current, mechanicId: value || null, page: 0 }));
    this.load();
  }

  protected onPageChange(page: number): void {
    this.query.update((current) => ({ ...current, page }));
    this.load();
  }

  protected open(order: WorkOrderSummary): void {
    void this.router.navigate(['/ordens', order.id]);
  }
}
