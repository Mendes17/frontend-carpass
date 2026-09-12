import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

import { FinanceApi } from '../../core/api/finance.api';
import { apiErrorMessage } from '../../core/http/api-error.util';
import {
  AnnualFinanceResponse,
  CategoryExpense,
  FinancePeriodsResponse,
  MonthlyFinanceResponse,
  MonthlyPoint,
} from '../../core/models/finance.model';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import {
  MoneyChartComponent,
  MoneyChartPoint,
  MoneyChartSeries,
} from '../../shared/components/money-chart/money-chart.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';

/** Modo de leitura: um mês ou um ano inteiro. */
type FinanceMode = 'MONTH' | 'YEAR';

/**
 * Painel financeiro da oficina.
 *
 * <h2>O que esta tela faz e o que ela não faz</h2>
 *
 * Ela <b>apresenta</b>. Bruto, despesas, líquido, comparação com o período
 * anterior e as fatias por categoria chegam calculados do servidor. Nenhuma
 * conta financeira acontece aqui — a subtração do líquido é trivial, e é
 * justamente por isso que ela se espalharia por três telas se começasse a ser
 * feita no navegador.
 *
 * <h2>Um período por vez</h2>
 *
 * Escolher agosto/2026 faz <b>todos</b> os indicadores serem de agosto/2026. O
 * gráfico dos seis meses recentes é contexto declarado, não um número que se
 * mistura aos cartões.
 *
 * <h2>Quem chega aqui</h2>
 *
 * Proprietário sempre; gerente quando o dono autorizou na tela da oficina. O
 * guard de rota evita a viagem inútil, mas quem barra de verdade é o backend:
 * a mesma requisição feita fora da tela recebe 403.
 */
@Component({
  selector: 'cp-finance-page',
  standalone: true,
  imports: [
    RouterLink,
    CurrencyPipe,
    DecimalPipe,
    MatIconModule,
    PageHeaderComponent,
    SkeletonComponent,
    EmptyStateComponent,
    MoneyChartComponent,
  ],
  templateUrl: './finance.page.html',
  styleUrl: './finance.page.css',
})
export class FinancePage {
  private readonly api = inject(FinanceApi);

  protected readonly mode = signal<FinanceMode>('MONTH');
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');

  protected readonly periods = signal<FinancePeriodsResponse>({ years: [], months: [] });
  protected readonly monthly = signal<MonthlyFinanceResponse | null>(null);
  protected readonly annual = signal<AnnualFinanceResponse | null>(null);

  private readonly hoje = new Date();
  protected readonly selectedYear = signal(this.hoje.getFullYear());
  protected readonly selectedMonth = signal(this.hoje.getMonth() + 1);

  /** Chave do mês no formato do seletor, para o `<select>` casar a opção. */
  protected readonly monthKey = computed(() => `${this.selectedYear()}-${this.selectedMonth()}`);

  /** O resumo do período em foco, seja ele mês ou ano. */
  protected readonly summary = computed(() =>
    this.mode() === 'MONTH' ? this.monthly()?.summary ?? null : this.annual()?.summary ?? null,
  );

  protected readonly byCategory = computed<CategoryExpense[]>(() =>
    this.mode() === 'MONTH' ? this.monthly()?.byCategory ?? [] : this.annual()?.byCategory ?? [],
  );

  /** Título do período, para o cabeçalho dizer o que está na tela. */
  protected readonly periodLabel = computed(() =>
    this.mode() === 'MONTH' ? this.monthly()?.label ?? '' : String(this.annual()?.year ?? ''),
  );

  /** Os mesmos mês/ano em foco aqui, para a folha impressa abrir no período certo. */
  protected readonly printParams = computed(() =>
    this.mode() === 'MONTH'
      ? { modo: 'MONTH', ano: this.selectedYear(), mes: this.selectedMonth() }
      : { modo: 'YEAR', ano: this.selectedYear() },
  );

  // ------------------------------------------------------------ gráficos
  protected readonly serieBrutoEDespesa: MoneyChartSeries[] = [
    { name: 'Faturamento bruto', colorVar: '--cp-chart-gross' },
    { name: 'Despesas', colorVar: '--cp-chart-expense' },
  ];

  protected readonly serieLiquido: MoneyChartSeries[] = [
    { name: 'Resultado', colorVar: '--cp-chart-gross', signColored: true },
  ];

  /** Os pontos do período: seis meses no modo mensal, doze no anual. */
  private readonly points = computed<MonthlyPoint[]>(() =>
    this.mode() === 'MONTH' ? this.monthly()?.recentMonths ?? [] : this.annual()?.months ?? [],
  );

  protected readonly chartGrossExpense = computed<MoneyChartPoint[]>(() =>
    this.points().map((ponto) => ({
      label: ponto.label,
      values: [ponto.grossRevenue, ponto.expenses],
    })),
  );

  protected readonly chartNet = computed<MoneyChartPoint[]>(() =>
    this.points().map((ponto) => ({ label: ponto.label, values: [ponto.netRevenue] })),
  );

  // -------------------------------------------------------- comparação
  /**
   * Variação percentual contra o período anterior.
   *
   * Devolve null quando o mês anterior foi zero: dividir por zero daria
   * "infinito por cento", e uma tela que mostra ∞% perde a confiança de quem
   * lê o resto dos números. Nesse caso a interface diz que não há base de
   * comparação, que é a verdade.
   */
  protected readonly grossChange = computed(() => this.variacao('grossRevenue'));
  protected readonly expenseChange = computed(() => this.variacao('expenses'));
  protected readonly netChange = computed(() => this.variacao('netRevenue'));

  private variacao(campo: 'grossRevenue' | 'expenses' | 'netRevenue'): number | null {
    const atual = this.monthly();
    if (this.mode() !== 'MONTH' || !atual) {
      return null;
    }

    const anterior = atual.previous[campo];
    if (!anterior) {
      return null;
    }

    return ((atual.summary[campo] - anterior) / Math.abs(anterior)) * 100;
  }

  constructor() {
    this.loadPeriods();
    this.load();
  }

  // ------------------------------------------------------------- carga
  private loadPeriods(): void {
    this.api.periods().subscribe({
      next: (periodos) => this.periods.set(periodos),
      // Sem a lista, os seletores ficam vazios mas o período atual já está
      // carregado — a tela continua servindo em vez de virar uma mensagem.
      error: () => this.periods.set({ years: [], months: [] }),
    });
  }

  protected load(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    const aoFalhar = (erro: unknown) => {
      this.loading.set(false);
      this.errorMessage.set(apiErrorMessage(erro));
    };

    if (this.mode() === 'MONTH') {
      this.api.monthly(this.selectedYear(), this.selectedMonth()).subscribe({
        next: (dados) => {
          this.monthly.set(dados);
          this.loading.set(false);
        },
        error: aoFalhar,
      });
      return;
    }

    this.api.annual(this.selectedYear()).subscribe({
      next: (dados) => {
        this.annual.set(dados);
        this.loading.set(false);
      },
      error: aoFalhar,
    });
  }

  // ------------------------------------------------------------ ações
  protected setMode(mode: FinanceMode): void {
    if (this.mode() === mode) {
      return;
    }
    this.mode.set(mode);
    this.load();
  }

  protected onMonthChange(event: Event): void {
    const [ano, mes] = (event.target as HTMLSelectElement).value.split('-').map(Number);
    this.selectedYear.set(ano);
    this.selectedMonth.set(mes);
    this.load();
  }

  protected onYearChange(event: Event): void {
    this.selectedYear.set(Number((event.target as HTMLSelectElement).value));
    this.load();
  }

  /**
   * Anda um mês para trás ou para frente.
   *
   * As setas existem porque comparar meses vizinhos é o gesto mais frequente
   * desta tela, e caçar a opção certa num select de vinte itens a cada passo
   * cansa. Elas param nos limites do que o seletor oferece — avançar para um
   * mês que ainda não chegou traria só zeros.
   */
  protected stepMonth(passo: number): void {
    const opcoes = this.periods().months;
    const atual = opcoes.findIndex(
      (opcao) => opcao.year === this.selectedYear() && opcao.month === this.selectedMonth(),
    );
    if (atual < 0) {
      return;
    }

    // A lista vem do mais recente para o mais antigo, então "mês anterior"
    // avança no índice.
    const destino = opcoes[atual - passo];
    if (!destino) {
      return;
    }

    this.selectedYear.set(destino.year);
    this.selectedMonth.set(destino.month);
    this.load();
  }

  protected canStep(passo: number): boolean {
    const opcoes = this.periods().months;
    const atual = opcoes.findIndex(
      (opcao) => opcao.year === this.selectedYear() && opcao.month === this.selectedMonth(),
    );
    return atual >= 0 && !!opcoes[atual - passo];
  }

  protected stepYear(passo: number): void {
    const anos = this.periods().years;
    const atual = anos.indexOf(this.selectedYear());
    const destino = atual < 0 ? undefined : anos[atual - passo];
    if (destino === undefined) {
      return;
    }
    this.selectedYear.set(destino);
    this.load();
  }

  protected canStepYear(passo: number): boolean {
    const anos = this.periods().years;
    const atual = anos.indexOf(this.selectedYear());
    return atual >= 0 && anos[atual - passo] !== undefined;
  }
}
