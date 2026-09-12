import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';

import { ServiceCatalogApi } from '../../core/api/service-catalog.api';
import { apiErrorMessage } from '../../core/http/api-error.util';
import { PageQuery, PageResponse, emptyPage } from '../../core/models/common.model';
import { ServiceCatalogResponse } from '../../core/models/service-catalog.model';
import { AuthService } from '../../core/auth/auth.service';
import { SnackbarService } from '../../core/services/snackbar.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { PaginatorComponent } from '../../shared/components/paginator/paginator.component';
import { SearchInputComponent } from '../../shared/components/search-input/search-input.component';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';

/** Catálogo de serviços da oficina. */
@Component({
  selector: 'cp-service-list-page',
  standalone: true,
  imports: [
    RouterLink,
    CurrencyPipe,
    MatIconModule,
    PageHeaderComponent,
    SearchInputComponent,
    PaginatorComponent,
    EmptyStateComponent,
    SkeletonComponent,
  ],
  templateUrl: './service-list.page.html',
  styleUrl: '../_shared/list-page.css',
})
export class ServiceListPage {
  private readonly api = inject(ServiceCatalogApi);
  private readonly dialog = inject(MatDialog);
  private readonly snackbar = inject(SnackbarService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /**
   * Só a gerência cadastra e edita serviços do catálogo.
   *
   * A checagem aqui é conveniência: quem barra de verdade é o backend. Mas sem
   * ela a pessoa preenchia o formulário inteiro para descobrir no salvar que
   * não podia — o erro precisa aparecer antes do trabalho, não depois.
   */
  protected readonly canManage = computed(() => this.auth.hasAnyRole('OWNER', 'MANAGER'));

  private avisarSemPermissao(): void {
    this.snackbar.error(
      'Você não tem permissão para editar o catálogo de serviços. Fale com o gerente ou o proprietário da oficina.',
    );
  }

  protected readonly page = signal<PageResponse<ServiceCatalogResponse>>(emptyPage());
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
    this.api.list(this.query()).subscribe({
      next: (result) => {
        this.page.set(result);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected onSearch(term: string): void {
    // Buscar sempre volta para a primeira página.
    this.query.update((current) => ({ ...current, q: term, page: 0 }));
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

  protected edit(service: ServiceCatalogResponse): void {
    if (!this.canManage()) {
      this.avisarSemPermissao();
      return;
    }

    void this.router.navigate(['/servicos', service.id]);
  }

  /** Duração em minutos vira "1h 30min", que é como a oficina fala. */
  protected formatDuration(minutes: number | null): string {
    if (!minutes) {
      return '—';
    }
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    if (hours === 0) {
      return `${rest}min`;
    }
    return rest === 0 ? `${hours}h` : `${hours}h ${rest}min`;
  }

  protected toggleStatus(service: ServiceCatalogResponse): void {
    if (!service.active) {
      this.changeStatus(service, true);
      return;
    }

    this.dialog
      .open(ConfirmDialogComponent, {
        width: '440px',
        data: {
          title: 'Desativar serviço',
          message: `"${service.name}" deixa de aparecer ao montar novas ordens de serviço. As ordens que já usam esse serviço continuam intactas.`,
          confirmText: 'Desativar',
          cancelText: 'Cancelar',
          type: 'danger',
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) {
          this.changeStatus(service, false);
        }
      });
  }

  private changeStatus(service: ServiceCatalogResponse, active: boolean): void {
    this.api.changeStatus(service.id, active).subscribe({
      next: () => {
        this.snackbar.success(active ? 'Serviço reativado.' : 'Serviço desativado.');
        this.load();
      },
      error: (error: unknown) => this.snackbar.error(apiErrorMessage(error)),
    });
  }
}
