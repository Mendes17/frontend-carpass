import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

import { VehicleApi } from '../../core/api/vehicle.api';
import { apiErrorMessage } from '../../core/http/api-error.util';
import { MaintenanceRecordRequest, VehicleHistoryEntry, VehicleResponse } from '../../core/models/vehicle.model';
import { SnackbarService } from '../../core/services/snackbar.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import { MaintenanceRecordDialog } from './maintenance-record.dialog';

/**
 * Linha do tempo de manutenção do veículo.
 *
 * A lista é montada no servidor a partir das ordens concluídas mais os
 * lançamentos manuais — não existe cópia da OS em uma tabela de histórico. A
 * consequência prática: corrigir uma ordem corrige o histórico junto, em vez de
 * deixar as duas versões brigando.
 *
 * Só o lançamento manual pode ser removido daqui. Apagar uma OS pelo histórico
 * seria apagar registro de trabalho executado.
 */
@Component({
  selector: 'cp-vehicle-history-page',
  standalone: true,
  imports: [
    RouterLink,
    CurrencyPipe,
    DatePipe,
    DecimalPipe,
    MatIconModule,
    PageHeaderComponent,
    EmptyStateComponent,
    SkeletonComponent,
  ],
  templateUrl: './vehicle-history.page.html',
  styleUrl: './vehicle-history.page.css',
})
export class VehicleHistoryPage {
  readonly id = input.required<string>();

  private readonly api = inject(VehicleApi);
  private readonly dialog = inject(MatDialog);
  private readonly snackbar = inject(SnackbarService);

  protected readonly vehicle = signal<VehicleResponse | null>(null);
  protected readonly entries = signal<VehicleHistoryEntry[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');

  protected readonly subtitle = computed(() => {
    const v = this.vehicle();
    return v ? `${v.plate} · ${v.brand} ${v.model} · ${v.customerName}` : '';
  });

  /** Quanto o cliente já gastou com este carro, somando o que tem valor. */
  protected readonly totalSpent = computed(() =>
    this.entries().reduce((sum, entry) => sum + (entry.amount ?? 0), 0),
  );

  constructor() {
    queueMicrotask(() => {
      this.loadVehicle();
      this.loadHistory();
    });
  }

  private loadVehicle(): void {
    this.api.getById(this.id()).subscribe({
      next: (vehicle) => this.vehicle.set(vehicle),
      error: (error: unknown) => this.errorMessage.set(apiErrorMessage(error)),
    });
  }

  private loadHistory(): void {
    this.loading.set(true);
    this.api.history(this.id()).subscribe({
      next: (entries) => {
        this.entries.set(entries);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.errorMessage.set(apiErrorMessage(error));
      },
    });
  }

  protected addRecord(): void {
    this.dialog
      .open(MaintenanceRecordDialog, { width: '600px' })
      .afterClosed()
      .subscribe((body: MaintenanceRecordRequest | null) => {
        if (!body) {
          return;
        }
        this.api.addHistoryRecord(this.id(), body).subscribe({
          next: () => {
            this.snackbar.success('Manutenção lançada no histórico.');
            this.loadHistory();
          },
          error: (error: unknown) => this.snackbar.error(apiErrorMessage(error)),
        });
      });
  }

  protected removeRecord(entry: VehicleHistoryEntry): void {
    this.dialog
      .open(ConfirmDialogComponent, {
        width: '440px',
        data: {
          title: 'Remover lançamento',
          message: `"${entry.description}" sai do histórico deste veículo. Isso não afeta nenhuma ordem de serviço.`,
          confirmText: 'Remover',
          cancelText: 'Cancelar',
          type: 'danger',
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) {
          return;
        }
        this.api.removeHistoryRecord(this.id(), entry.id).subscribe({
          next: () => {
            this.snackbar.success('Lançamento removido.');
            this.loadHistory();
          },
          error: (error: unknown) => this.snackbar.error(apiErrorMessage(error)),
        });
      });
  }
}
