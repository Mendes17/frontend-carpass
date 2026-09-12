import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';

import { FinanceApi } from '../../core/api/finance.api';
import { WorkshopApi } from '../../core/api/workshop.api';
import { apiErrorMessage } from '../../core/http/api-error.util';
import { Address } from '../../core/models/common.model';
import {
  AnnualFinanceResponse,
  CategoryExpense,
  FinanceSummary,
  MonthlyFinanceResponse,
} from '../../core/models/finance.model';
import { WorkshopResponse } from '../../core/models/workshop.model';

type FinanceMode = 'MONTH' | 'YEAR';

/**
 * O resultado financeiro em papel.
 *
 * <h2>Por que existe, já havendo a tela</h2>
 *
 * <p>
 * O painel é para acompanhar; esta folha é para entregar — ao contador, a um
 * sócio, para arquivo próprio. Mesma ideia das folhas de OS e orçamento: o que
 * está na tela é o que sai na impressora, e o mesmo botão salva em PDF pelo
 * diálogo do navegador.
 * </p>
 *
 * <h2>Por que não tem gráfico</h2>
 *
 * <p>
 * As barras da tela usam cor para comparar meses lado a lado — útil olhando na
 * hora, dispensável numa folha que alguém vai ler como números, não como forma.
 * A folha impressa é sempre clara e monocromática, como as outras duas; manter
 * o gráfico custaria depender de tokens de tema que este documento não usa em
 * nenhum outro lugar. As tabelas trazem os mesmos números, só que em texto.
 * </p>
 *
 * <h2>De onde vem o período</h2>
 *
 * <p>
 * Por query params (`modo`, `ano`, `mes`), não por estado compartilhado com a
 * tela: a pessoa pode abrir esta folha numa aba nova sem perder o que estava
 * vendo no painel, e o link pode ser copiado já apontando para o período certo.
 * </p>
 */
@Component({
  selector: 'cp-finance-print-page',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, DatePipe, DecimalPipe],
  templateUrl: './finance-print.page.html',
  styleUrl: './finance-print.page.css',
})
export class FinancePrintPage {
  readonly modo = input<FinanceMode>('MONTH');
  readonly ano = input<string>();
  readonly mes = input<string>();

  private readonly api = inject(FinanceApi);
  private readonly workshopApi = inject(WorkshopApi);

  protected readonly workshop = signal<WorkshopResponse | null>(null);
  protected readonly monthly = signal<MonthlyFinanceResponse | null>(null);
  protected readonly annual = signal<AnnualFinanceResponse | null>(null);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');

  /** Momento da emissão — vai impresso, para datar a folha. */
  protected readonly emittedAt = new Date();

  protected readonly mode = computed(() => this.modo());

  protected readonly summary = computed<FinanceSummary | null>(() =>
    this.mode() === 'MONTH' ? this.monthly()?.summary ?? null : this.annual()?.summary ?? null,
  );

  protected readonly byCategory = computed<CategoryExpense[]>(() =>
    this.mode() === 'MONTH' ? this.monthly()?.byCategory ?? [] : this.annual()?.byCategory ?? [],
  );

  protected readonly periodLabel = computed(() =>
    this.mode() === 'MONTH' ? this.monthly()?.label ?? '' : String(this.annual()?.year ?? ''),
  );

  constructor() {
    // Os inputs de rota já chegam prontos no primeiro ciclo, mas a leitura
    // corre em uma microtask por segurança — mesmo padrão das outras folhas.
    queueMicrotask(() => this.load());
  }

  private load(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    const anoNumero = Number(this.ano());
    const mesNumero = Number(this.mes());
    const periodoValido = this.mode() === 'MONTH' ? Boolean(anoNumero && mesNumero) : Boolean(anoNumero);

    if (!periodoValido) {
      this.loading.set(false);
      this.errorMessage.set('Período inválido para impressão.');
      return;
    }

    // A oficina é só o cabeçalho da folha: se a busca falhar, o relatório sai
    // mesmo assim com os números, que é o que importa aqui.
    this.workshopApi
      .get()
      .pipe(catchError(() => of(null)))
      .subscribe((oficina) => this.workshop.set(oficina));

    if (this.mode() === 'MONTH') {
      this.api.monthly(anoNumero, mesNumero).subscribe({
        next: (dados) => {
          this.monthly.set(dados);
          this.loading.set(false);
        },
        error: (erro: unknown) => {
          this.loading.set(false);
          this.errorMessage.set(apiErrorMessage(erro));
        },
      });
      return;
    }

    this.api.annual(anoNumero).subscribe({
      next: (dados) => {
        this.annual.set(dados);
        this.loading.set(false);
      },
      error: (erro: unknown) => {
        this.loading.set(false);
        this.errorMessage.set(apiErrorMessage(erro));
      },
    });
  }

  protected print(): void {
    window.print();
  }

  /** Monta o endereço numa linha só; devolve vazio quando não há nada de útil. */
  protected formatAddress(address: Address | null | undefined): string {
    if (!address) {
      return '';
    }

    const rua = [address.street, address.number].filter(Boolean).join(', ');
    const cidade = [address.city, address.state].filter(Boolean).join('/');
    return [rua, address.complement, address.neighborhood, cidade, address.zipCode]
      .filter((parte) => !!parte && String(parte).trim().length > 0)
      .join(' · ');
  }
}
