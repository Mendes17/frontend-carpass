import { StockMovementType } from './enums.model';

export interface PartResponse {
  id: string;
  code: string | null;
  name: string;
  manufacturer: string | null;
  /** O que a peça é. Null enquanto ninguém classificou. */
  partTypeId: string | null;
  /** Nome do tipo, para a listagem não precisar de uma segunda busca. */
  partTypeName: string | null;
  costPrice: number | null;
  salePrice: number | null;
  stockQuantity: number;
  minimumStock: number;
  /** Calculado no servidor: já indica o que precisa de reposição. */
  belowMinimumStock: boolean;
  active: boolean;
  createdAt: string;
}

export interface PartRequest {
  code?: string | null;
  name: string;
  manufacturer?: string | null;
  /** Opcional: peça lançada às pressas entra sem tipo e é classificada depois. */
  partTypeId?: string | null;
  costPrice?: number | null;
  salePrice?: number | null;
  minimumStock: number;
  /** Só vale na criação: vira a primeira movimentação de entrada. */
  initialStock?: number | null;
}

export interface StockMovementRequest {
  type: StockMovementType;
  /** No ajuste, é o novo saldo absoluto; nos demais, a quantidade movimentada. */
  quantity: number;
  reason?: string | null;
}

export interface StockMovementResponse {
  id: string;
  type: StockMovementType;
  typeLabel: string;
  quantity: number;
  previousStock: number | null;
  resultingStock: number | null;
  reason: string | null;
  workOrderId: string | null;
  createdBy: string | null;
  createdAt: string;
}
