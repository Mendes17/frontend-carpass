/**
 * O resultado de um período: bruto, despesas e líquido.
 *
 * O líquido vem pronto do servidor. Subtrair dois números é trivial — e é
 * justamente por isso que a conta apareceria em três telas se o frontend a
 * fizesse; no dia em que a regra mudar, uma delas ficaria para trás.
 */
export interface FinanceSummary {
  grossRevenue: number;
  expenses: number;
  /** Pode ser negativo. Mês no vermelho precisa aparecer como vermelho. */
  netRevenue: number;
  orderCount: number;
  expenseCount: number;
}

/** Um mês na série temporal. Meses sem movimento vêm zerados, não somem. */
export interface MonthlyPoint {
  year: number;
  month: number;
  /** "Ago" — rótulo curto do eixo, montado no servidor. */
  label: string;
  grossRevenue: number;
  expenses: number;
  netRevenue: number;
  orderCount: number;
}

/** Quanto uma categoria pesou no período. */
export interface CategoryExpense {
  categoryId: string;
  categoryName: string;
  amount: number;
  count: number;
  /** Fatia do total, de 0 a 100. Vem calculada do servidor. */
  share: number;
}

export interface MonthlyFinanceResponse {
  year: number;
  month: number;
  /** "Agosto de 2026". */
  label: string;
  summary: FinanceSummary;
  /** O mês anterior, para a comparação. Vem sempre, mesmo zerado. */
  previous: FinanceSummary;
  previousLabel: string;
  /** Os seis meses terminando no escolhido, como contexto do gráfico. */
  recentMonths: MonthlyPoint[];
  byCategory: CategoryExpense[];
}

export interface AnnualFinanceResponse {
  year: number;
  summary: FinanceSummary;
  /** Os doze meses, sempre. */
  months: MonthlyPoint[];
  /** Null quando o ano não teve faturamento nenhum. */
  bestMonth: MonthlyPoint | null;
  worstMonth: MonthlyPoint | null;
  byCategory: CategoryExpense[];
}

export interface PeriodOption {
  year: number;
  month: number;
  /** "Agosto de 2026". */
  label: string;
}

export interface FinancePeriodsResponse {
  years: number[];
  months: PeriodOption[];
}
