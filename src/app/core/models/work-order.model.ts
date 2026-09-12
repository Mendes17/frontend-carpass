import { ItemType, QuoteStatus, WorkOrderStatus } from './enums.model';

export interface WorkOrderItemResponse {
  id: string;
  type: ItemType;
  typeLabel: string;
  partId: string | null;
  serviceCatalogId: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface WorkOrderItemRequest {
  type: ItemType;
  partId?: string | null;
  serviceCatalogId?: string | null;
  description?: string | null;
  quantity: number;
  unitPrice?: number | null;
}

/** Versão enxuta usada em listagens e no painel. */
export interface WorkOrderSummary {
  id: string;
  number: number;
  status: WorkOrderStatus;
  statusLabel: string;
  quoteStatus: QuoteStatus;
  quoteStatusLabel: string;
  customerId: string;
  customerName: string;
  vehicleId: string;
  vehiclePlate: string;
  vehicleDescription: string;
  assignedMechanicName: string | null;
  totalAmount: number | null;
  openedAt: string;
  estimatedDeliveryDate: string | null;
  deliveredAt: string | null;
}

export interface WorkOrderResponse {
  id: string;
  number: number;
  status: WorkOrderStatus;
  statusLabel: string;
  /**
   * Estados para os quais esta OS pode ir agora, decididos pelo backend.
   *
   * A tela só oferece o que está aqui, em vez de montar o menu de ações por conta
   * própria e descobrir o erro depois do clique.
   */
  allowedNextStatuses: WorkOrderStatus[];
  /** False quando a OS está travada por estar finalizada ou com orçamento aprovado. */
  editable: boolean;
  quoteStatus: QuoteStatus;
  quoteStatusLabel: string;
  /**
   * Por que o cliente recusou. Vem junto do orçamento, e não só na linha do
   * tempo, porque é o dado que decide o próximo passo da oficina.
   */
  quoteRejectionReason: string | null;
  customerId: string;
  customerName: string;
  vehicleId: string;
  vehiclePlate: string;
  vehicleDescription: string;
  assignedMechanicId: string | null;
  assignedMechanicName: string | null;
  reportedProblem: string | null;
  diagnosis: string | null;
  notes: string | null;
  mileage: number | null;
  items: WorkOrderItemResponse[];
  partsTotal: number | null;
  servicesTotal: number | null;
  discount: number | null;
  totalAmount: number | null;
  estimatedDeliveryDate: string | null;
  openedAt: string;
  approvedAt: string | null;
  finishedAt: string | null;
  deliveredAt: string | null;
  canceledAt: string | null;
}

export interface WorkOrderCreateRequest {
  vehicleId: string;
  assignedMechanicId?: string | null;
  reportedProblem?: string | null;
  mileage?: number | null;
  estimatedDeliveryDate?: string | null;
  notes?: string | null;
  items?: WorkOrderItemRequest[];
}

export interface WorkOrderUpdateRequest {
  assignedMechanicId?: string | null;
  reportedProblem?: string | null;
  diagnosis?: string | null;
  mileage?: number | null;
  estimatedDeliveryDate?: string | null;
  discount?: number | null;
  notes?: string | null;
}

export interface StatusChangeRequest {
  status: WorkOrderStatus;
  note?: string | null;
}

export interface NoteRequest {
  note?: string | null;
}

export interface WorkOrderStatusHistoryEntry {
  id: string;
  fromStatus: WorkOrderStatus | null;
  fromStatusLabel: string | null;
  toStatus: WorkOrderStatus;
  toStatusLabel: string;
  changedBy: string | null;
  note: string | null;
  changedAt: string;
}

/** Filtros da listagem de ordens de serviço. */
export interface WorkOrderQuery {
  page?: number;
  size?: number;
  sort?: string;
  q?: string | null;
  status?: WorkOrderStatus | null;
  mechanicId?: string | null;
  customerId?: string | null;
  vehicleId?: string | null;
  from?: string | null;
  to?: string | null;
}
