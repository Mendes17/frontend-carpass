import { WorkOrderStatus } from './enums.model';
import { WorkOrderSummary } from './work-order.model';

/** Tudo que a tela inicial precisa, em uma chamada só. */
export interface DashboardResponse {
  totals: DashboardTotals;
  ordersByStatus: StatusCount[];
  /**
   * Faturamento do mês. Vem `null` para atendente e mecânico — o backend não
   * envia o número para quem não pode vê-lo, em vez de deixar a tela escondê-lo.
   */
  monthRevenue: number | null;
  topServices: TopService[];
  recentOrders: WorkOrderSummary[];
  upcomingDeliveries: WorkOrderSummary[];
}

export interface DashboardTotals {
  customers: number;
  vehicles: number;
  employees: number;
  openWorkOrders: number;
  lowStockParts: number;
}

export interface StatusCount {
  status: WorkOrderStatus;
  label: string;
  count: number;
}

export interface TopService {
  description: string;
  count: number;
}
