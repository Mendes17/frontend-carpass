import { DecimalPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';

import { VehicleApi, VehicleQuery } from '../../core/api/vehicle.api';
import { apiErrorMessage } from '../../core/http/api-error.util';
import { PageResponse, emptyPage } from '../../core/models/common.model';
import { VehicleResponse } from '../../core/models/vehicle.model';
import { SnackbarService } from '../../core/services/snackbar.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { PaginatorComponent } from '../../shared/components/paginator/paginator.component';
import { SearchInputComponent } from '../../shared/components/search-input/search-input.component';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';

/** Lista de veículos atendidos pela oficina. */
@Component({
  selector: 'cp-vehicle-list-page',
  standalone: true,
  imports: [
    RouterLink,
    DecimalPipe,
    MatIconModule,
    PageHeaderComponent,
    SearchInputComponent,
    PaginatorComponent,
    EmptyStateComponent,
    SkeletonComponent,
  ],
  templateUrl: './vehicle-list.page.html',
  styleUrl: '../_shared/list-page.css',
})
export class VehicleListPage {
  private readonly api = inject(VehicleApi);
  private readonly dialog = inject(MatDialog);
  private readonly snackbar = inject(SnackbarService);
  private readonly router = inject(Router);

  protected readonly page = signal<PageResponse<VehicleResponse>>(emptyPage());
  protected readonly loading = signal(true);
  protected readonly query = signal<VehicleQuery>({
    page: 0,
    size: 20,
    sort: 'plate,asc',
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

  protected edit(vehicle: VehicleResponse): void {
    void this.router.navigate(['/veiculos', vehicle.id]);
  }

  protected openHistory(vehicle: VehicleResponse): void {
    void this.router.navigate(['/veiculos', vehicle.id, 'historico']);
  }

  protected toggleStatus(vehicle: VehicleResponse): void {
    if (!vehicle.active) {
      this.changeStatus(vehicle, true);
      return;
    }

    this.dialog
      .open(ConfirmDialogComponent, {
        width: '420px',
        data: {
          title: 'Desativar veículo',
          message: `O veículo ${vehicle.plate} deixa de aparecer nas listas e não poderá entrar em novas ordens de serviço. O histórico de manutenção é preservado.`,
          confirmText: 'Desativar',
          cancelText: 'Cancelar',
          type: 'danger',
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) {
          this.changeStatus(vehicle, false);
        }
      });
  }

  private changeStatus(vehicle: VehicleResponse, active: boolean): void {
    this.api.changeStatus(vehicle.id, active).subscribe({
      next: () => {
        this.snackbar.success(active ? 'Veículo reativado.' : 'Veículo desativado.');
        this.load();
      },
      error: (error: unknown) => this.snackbar.error(apiErrorMessage(error)),
    });
  }

  /** Mostra a placa no formato que a pessoa está acostumada a ler. */
  protected formatPlate(plate: string): string {
    return plate.length === 7 ? `${plate.slice(0, 3)}-${plate.slice(3)}` : plate;
  }
}
