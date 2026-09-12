export interface ExpenseResponse {
  id: string;
  description: string;
  amount: number;
  /** Data no formato ISO (yyyy-MM-dd). Despesa pertence a um dia, não a um instante. */
  expenseDate: string;
  categoryId: string;
  categoryName: string;
  notes: string | null;
  createdById: string | null;
  /** Quem lançou. Vem como texto para a listagem não precisar de uma segunda busca. */
  createdBy: string | null;
  createdAt: string;
}

export interface ExpenseRequest {
  description: string;
  amount: number;
  expenseDate: string;
  categoryId: string;
  notes?: string | null;
}

export interface ExpenseCategoryResponse {
  id: string;
  name: string;
  description: string | null;
  /** Quantos lançamentos usam a categoria, para o aviso antes de desativar. */
  expenseCount: number;
  active: boolean;
  createdAt: string;
}

export interface ExpenseCategoryRequest {
  name: string;
  description?: string | null;
}
