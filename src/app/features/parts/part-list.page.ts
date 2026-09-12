import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';

import { PartApi, PartQuery } from '../../core/api/part.api';
import { PartTypeApi } from '../../core/api/part-type.api';
import { apiErrorMessage } from '../../core/http/api-error.util';
import { PageResponse, emptyPage } from '../../core/models/common.model';
import { PartManufacturerResponse, PartTypeResponse } from '../../core/models/part-type.model';
import { PartResponse, StockMovementRequest } from '../../core/models/part.model';
import { AuthService } from '../../core/auth/auth.service';
import { SnackbarService } from '../../core/services/snackbar.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { PaginatorComponent } from '../../shared/components/paginator/paginator.component';
import { SearchInputComponent } from '../../shared/components/search-input/search-input.component';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import { StockMovementDialog } from './stock-movement.dialog';

/** Peças e estoque. */
@Component({
  selector: 'cp-part-list-page',
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
  templateUrl: './part-list.page.html',
  styleUrls: ['../_shared/list-page.css', './part-list.page.css'],
})
export class PartListPage {
  private readonly api = inject(PartApi);
  private readonly partTypeApi = inject(PartTypeApi);
  private readonly dialog = inject(MatDialog);
  private readonly snackbar = inject(SnackbarService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /**
   * Só a gerência cadastra e edita peças.
   *
   * A checagem aqui é conveniência: quem barra de verdade é o backend. Mas sem
   * ela a pessoa preenchia o formulário inteiro para descobrir no salvar que
   * não podia — o erro precisa aparecer antes do trabalho, não depois.
   */
  protected readonly canManage = computed(() => this.auth.hasAnyRole('OWNER', 'MANAGER'));

  private avisarSemPermissao(): void {
    this.snackbar.error(
      'Você não tem permissão para editar peças. Fale com o gerente ou o proprietário da oficina.',
    );
  }

  protected readonly page = signal<PageResponse<PartResponse>>(emptyPage());
  protected readonly loading = signal(true);
  protected readonly query = signal<PartQuery>({
    page: 0,
    size: 20,
    sort: 'name,asc',
    q: '',
    active: true,
    lowStock: null,
    typeId: null,
    brand: null,
  });

  /** Tipos ativos, para o filtro. Carregados uma vez. */
  protected readonly types = signal<PartTypeResponse[]>([]);

  /**
   * Marcas presentes no estoque.
   *
   * Recarrega quando o tipo muda, e é aí que o filtro fica útil: escolher "óleo
   * de motor" faz a lista virar exatamente as marcas de óleo de motor que a
   * oficina tem — a pergunta do balcão com o carro no elevador.
   */
  protected readonly brands = signal<PartManufacturerResponse[]>([]);

  constructor() {
    this.load();
    this.loadTypes();
    this.loadBrands();
  }

  private loadTypes(): void {
    this.partTypeApi.listActive().subscribe({
      next: (list) => this.types.set(list),
      // Falhar aqui não pode derrubar a listagem: sem tipos o filtro fica vazio
      // e o resto da tela continua servindo.
      error: () => this.types.set([]),
    });
  }

  private loadBrands(): void {
    this.api.manufacturers(this.query().typeId).subscribe({
      next: (list) => this.brands.set(list),
      error: () => this.brands.set([]),
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

  /**
   * Trocar o tipo zera a marca escolhida.
   *
   * Sem isso, escolher "óleo de motor" + "Mobil" e depois trocar para "vela"
   * deixaria a tela pedindo velas da Mobil — provavelmente zero resultados, e a
   * pessoa concluiria que o estoque está vazio quando o filtro é que ficou
   * incoerente. A lista de marcas também é refeita para o tipo novo.
   */
  protected onTypeFilter(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.query.update((current) => ({ ...current, typeId: value || null, brand: null, page: 0 }));
    this.load();
    this.loadBrands();
  }

  protected onBrandFilter(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.query.update((current) => ({ ...current, brand: value || null, page: 0 }));
    this.load();
  }

  protected onStockFilter(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.query.update((current) => ({ ...current, lowStock: value === 'low' ? true : null, page: 0 }));
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

  protected edit(part: PartResponse): void {
    if (!this.canManage()) {
      this.avisarSemPermissao();
      return;
    }

    void this.router.navigate(['/pecas', part.id]);
  }

  protected moveStock(part: PartResponse): void {
    if (!this.canManage()) {
      this.snackbar.error(
        'Você não tem permissão para movimentar o estoque. Fale com o gerente ou o proprietário da oficina.',
      );
      return;
    }

    this.dialog
      .open(StockMovementDialog, {
        width: '460px',
        data: { partName: part.name, currentStock: part.stockQuantity },
      })
      .afterClosed()
      .subscribe((body: StockMovementRequest | null) => {
        if (!body) {
          return;
        }
        this.api.registerStockMovement(part.id, body).subscribe({
          next: (updated) => {
            this.snackbar.success(`Estoque de "${updated.name}" agora é ${updated.stockQuantity}.`);
            this.load();
            // O saldo por marca mudou; o filtro tem que contar a mesma história.
            this.loadBrands();
          },
          error: (error: unknown) => this.snackbar.error(apiErrorMessage(error)),
        });
      });
  }

  protected toggleStatus(part: PartResponse): void {
    if (!part.active) {
      this.changeStatus(part, true);
      return;
    }

    this.dialog
      .open(ConfirmDialogComponent, {
        width: '440px',
        data: {
          title: 'Desativar peça',
          message: `"${part.name}" deixa de aparecer ao montar novas ordens de serviço. O saldo em estoque e o histórico de movimentações são preservados.`,
          confirmText: 'Desativar',
          cancelText: 'Cancelar',
          type: 'danger',
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) {
          this.changeStatus(part, false);
        }
      });
  }

  private changeStatus(part: PartResponse, active: boolean): void {
    this.api.changeStatus(part.id, active).subscribe({
      next: () => {
        this.snackbar.success(active ? 'Peça reativada.' : 'Peça desativada.');
        this.load();
        // Peça inativa sai da lista de marcas, e reativada volta.
        this.loadBrands();
      },
      error: (error: unknown) => this.snackbar.error(apiErrorMessage(error)),
    });
  }
}
