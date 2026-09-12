import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';

import { ExpenseApi, ExpenseQuery } from '../../core/api/expense.api';
import { apiErrorMessage } from '../../core/http/api-error.util';
import { PageResponse, emptyPage } from '../../core/models/common.model';
import { ExpenseCategoryResponse, ExpenseResponse } from '../../core/models/expense.model';
import { SnackbarService } from '../../core/services/snackbar.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { PaginatorComponent } from '../../shared/components/paginator/paginator.component';
import { SearchInputComponent } from '../../shared/components/search-input/search-input.component';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';

/** Atalhos de período. Cobrem o que se pergunta no dia a dia sem digitar data. */
type PeriodShortcut = 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_YEAR' | 'ALL' | 'CUSTOM';

/**
 * Despesas da oficina.
 *
 * <h2>O total não é a soma da página</h2>
 *
 * Ele vem de um endpoint próprio, calculado no banco sobre o mesmo filtro. Com
 * vinte lançamentos por página, somar o que chegou daria um "total do período"
 * que muda ao virar a página — e ninguém desconfiaria do número.
 *
 * <h2>Aqui excluir apaga mesmo</h2>
 *
 * No resto do sistema `DELETE` desativa, porque o histórico depende dos
 * cadastros. Despesa é diferente: lançada errada, ela precisa sair do
 * resultado. Uma despesa "inativa" que continuasse somando seria pior que não
 * ter o botão — por isso a confirmação diz que a exclusão é definitiva.
 */
@Component({
  selector: 'cp-expense-list-page',
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
  ],
  templateUrl: './expense-list.page.html',
  styleUrls: ['../_shared/list-page.css', './expense-list.page.css'],
})
export class ExpenseListPage {
  private readonly api = inject(ExpenseApi);
  private readonly dialog = inject(MatDialog);
  private readonly snackbar = inject(SnackbarService);
  private readonly router = inject(Router);

  protected readonly page = signal<PageResponse<ExpenseResponse>>(emptyPage());
  protected readonly categories = signal<ExpenseCategoryResponse[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(true);
  protected readonly shortcut = signal<PeriodShortcut>('THIS_MONTH');

  protected readonly query = signal<ExpenseQuery>({
    page: 0,
    size: 20,
    sort: 'expenseDate,desc',
    q: '',
    categoryId: null,
    ...monthRange(new Date()),
  });

  /** Descreve o filtro atual em uma linha, para o total dizer de que período é. */
  protected readonly periodLabel = computed(() => {
    const { from, to } = this.query();
    if (!from && !to) {
      return 'todo o período';
    }
    return `${formatBr(from)} a ${formatBr(to)}`;
  });

  constructor() {
    this.load();
    this.loadCategories();
  }

  private loadCategories(): void {
    this.api.listActiveCategories().subscribe({
      next: (lista) => this.categories.set(lista),
      // Sem categorias o filtro fica vazio, mas a listagem continua servindo.
      error: () => this.categories.set([]),
    });
  }

  protected load(): void {
    this.loading.set(true);

    this.api.list(this.query()).subscribe({
      next: (resultado) => {
        this.page.set(resultado);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });

    this.api.total(this.query()).subscribe({
      next: (valor) => this.total.set(valor),
      error: () => this.total.set(0),
    });
  }

  protected onSearch(term: string): void {
    this.query.update((atual) => ({ ...atual, q: term, page: 0 }));
    this.load();
  }

  protected onCategoryFilter(event: Event): void {
    const valor = (event.target as HTMLSelectElement).value;
    this.query.update((atual) => ({ ...atual, categoryId: valor || null, page: 0 }));
    this.load();
  }

  /**
   * Atalhos de período.
   *
   * "Mês passado" e "este ano" cobrem quase toda pergunta que se faz sobre
   * despesa, e digitar duas datas para isso seria trabalho à toa. Quem precisa
   * de um recorte diferente ainda tem os dois campos.
   */
  protected onShortcut(event: Event): void {
    const valor = (event.target as HTMLSelectElement).value as PeriodShortcut;
    this.shortcut.set(valor);

    const hoje = new Date();
    let faixa: { from: string | null; to: string | null };

    switch (valor) {
      case 'THIS_MONTH':
        faixa = monthRange(hoje);
        break;
      case 'LAST_MONTH':
        faixa = monthRange(new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1));
        break;
      case 'THIS_YEAR':
        faixa = { from: `${hoje.getFullYear()}-01-01`, to: `${hoje.getFullYear()}-12-31` };
        break;
      case 'ALL':
        faixa = { from: null, to: null };
        break;
      default:
        return; // CUSTOM mantém o que os campos de data já dizem.
    }

    this.query.update((atual) => ({ ...atual, ...faixa, page: 0 }));
    this.load();
  }

  protected onDateChange(campo: 'from' | 'to', event: Event): void {
    const valor = (event.target as HTMLInputElement).value;
    this.shortcut.set('CUSTOM');
    this.query.update((atual) => ({ ...atual, [campo]: valor || null, page: 0 }));
    this.load();
  }

  protected onPageChange(page: number): void {
    this.query.update((atual) => ({ ...atual, page }));
    this.load();
  }

  protected edit(expense: ExpenseResponse): void {
    void this.router.navigate(['/despesas', expense.id]);
  }

  /**
   * Exclui, com confirmação que diz o tamanho do estrago.
   *
   * O valor e a descrição entram na pergunta de propósito: confirmar "excluir
   * esta despesa?" é fácil demais quando se clicou na linha errada.
   */
  protected remove(expense: ExpenseResponse): void {
    this.dialog
      .open(ConfirmDialogComponent, {
        width: '460px',
        data: {
          title: 'Excluir despesa',
          message: `"${expense.description}" de ${formatMoney(expense.amount)} sai do resultado de ${formatBr(
            expense.expenseDate,
          )}. Esta exclusão é definitiva.`,
          confirmText: 'Excluir',
          cancelText: 'Cancelar',
          type: 'danger',
        },
      })
      .afterClosed()
      .subscribe((confirmado) => {
        if (!confirmado) {
          return;
        }

        this.api.delete(expense.id).subscribe({
          next: () => {
            this.snackbar.success('Despesa excluída.');
            this.load();
          },
          error: (erro: unknown) => this.snackbar.error(apiErrorMessage(erro)),
        });
      });
  }
}

/** Primeiro e último dia do mês de uma data, em ISO. */
function monthRange(data: Date): { from: string; to: string } {
  const ano = data.getFullYear();
  const mes = data.getMonth();
  const ultimo = new Date(ano, mes + 1, 0).getDate();
  const dois = (n: number) => String(n).padStart(2, '0');
  return { from: `${ano}-${dois(mes + 1)}-01`, to: `${ano}-${dois(mes + 1)}-${dois(ultimo)}` };
}

/** ISO para dd/MM/yyyy sem passar por Date, que aplicaria fuso e erraria o dia. */
function formatBr(iso: string | null | undefined): string {
  if (!iso) {
    return '—';
  }
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

function formatMoney(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
