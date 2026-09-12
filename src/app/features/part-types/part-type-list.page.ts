import { Component, computed, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';

import { PartTypeApi } from '../../core/api/part-type.api';
import { AuthService } from '../../core/auth/auth.service';
import { apiErrorMessage } from '../../core/http/api-error.util';
import { PageQuery, PageResponse, emptyPage } from '../../core/models/common.model';
import { PartTypeResponse } from '../../core/models/part-type.model';
import { SnackbarService } from '../../core/services/snackbar.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { PaginatorComponent } from '../../shared/components/paginator/paginator.component';
import { SearchInputComponent } from '../../shared/components/search-input/search-input.component';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';

/**
 * Tipos de peça.
 *
 * O que a peça é — óleo de motor, vela, bobina — separado de quem a fabrica.
 * Essa separação é o que permite a pergunta que o balcão faz de verdade:
 * "quais marcas de óleo de motor eu tenho?".
 */
@Component({
  selector: 'cp-part-type-list-page',
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
  templateUrl: './part-type-list.page.html',
  styleUrl: '../_shared/list-page.css',
})
export class PartTypeListPage {
  private readonly api = inject(PartTypeApi);
  private readonly dialog = inject(MatDialog);
  private readonly snackbar = inject(SnackbarService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /**
   * Só a gerência mexe no cadastro.
   *
   * A checagem aqui é conveniência: quem barra de verdade é o backend. Mas sem
   * ela a pessoa preencheria o formulário inteiro para descobrir no salvar que
   * não podia.
   */
  protected readonly canManage = computed(() => this.auth.hasAnyRole('OWNER', 'MANAGER'));

  protected readonly page = signal<PageResponse<PartTypeResponse>>(emptyPage());
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

  protected edit(type: PartTypeResponse): void {
    if (!this.canManage()) {
      this.snackbar.error(
        'Você não tem permissão para editar os tipos de peça. Fale com o gerente ou o proprietário da oficina.',
      );
      return;
    }

    void this.router.navigate(['/tipos-de-peca', type.id]);
  }

  /**
   * Desativar diz quantas peças saem de vista.
   *
   * Desativar "Vela" com 30 velas cadastradas muda o dia de quem procura vela no
   * estoque. O número está na resposta justamente para o aviso poder ser
   * concreto em vez de genérico.
   */
  protected toggleStatus(type: PartTypeResponse): void {
    if (!type.active) {
      this.changeStatus(type, true);
      return;
    }

    const emUso =
      type.partCount === 0
        ? 'Nenhuma peça usa este tipo hoje.'
        : type.partCount === 1
          ? 'Uma peça usa este tipo e continua com ele, mas o tipo some do filtro de novas peças.'
          : `${type.partCount} peças usam este tipo e continuam com ele, mas o tipo some do filtro de novas peças.`;

    this.dialog
      .open(ConfirmDialogComponent, {
        width: '440px',
        data: {
          title: 'Desativar tipo de peça',
          message: `"${type.name}" deixa de aparecer ao cadastrar ou filtrar peças. ${emUso}`,
          confirmText: 'Desativar',
          cancelText: 'Cancelar',
          type: 'danger',
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) {
          this.changeStatus(type, false);
        }
      });
  }

  private changeStatus(type: PartTypeResponse, active: boolean): void {
    this.api.changeStatus(type.id, active).subscribe({
      next: () => {
        this.snackbar.success(active ? 'Tipo reativado.' : 'Tipo desativado.');
        this.load();
      },
      error: (error: unknown) => this.snackbar.error(apiErrorMessage(error)),
    });
  }
}
