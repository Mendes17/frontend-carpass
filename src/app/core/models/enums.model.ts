/**
 * Enums do dominio, espelhando exatamente os valores do backend.
 *
 * Os rotulos ficam aqui para que a interface nunca precise traduzir uma constante
 * na mao, e para que uma mudanca de texto aconteca em um lugar so.
 */

export type Role = 'SYSTEM_ADMIN' | 'OWNER' | 'MANAGER' | 'RECEPTIONIST' | 'MECHANIC';

export const ROLE_LABELS: Record<Role, string> = {
  SYSTEM_ADMIN: 'Administrador do sistema',
  OWNER: 'Proprietário',
  MANAGER: 'Gerente',
  RECEPTIONIST: 'Atendente',
  MECHANIC: 'Mecânico',
};

/** Papéis que uma oficina pode atribuir. SYSTEM_ADMIN é da plataforma, não da oficina. */
export const ASSIGNABLE_ROLES: Role[] = ['OWNER', 'MANAGER', 'RECEPTIONIST', 'MECHANIC'];

export type CustomerType = 'INDIVIDUAL' | 'COMPANY';

export const CUSTOMER_TYPE_LABELS: Record<CustomerType, string> = {
  INDIVIDUAL: 'Pessoa física',
  COMPANY: 'Pessoa jurídica',
};

export type FuelType = 'GASOLINE' | 'ETHANOL' | 'FLEX' | 'DIESEL' | 'GNV' | 'ELECTRIC' | 'HYBRID';

export const FUEL_TYPE_LABELS: Record<FuelType, string> = {
  GASOLINE: 'Gasolina',
  ETHANOL: 'Etanol',
  FLEX: 'Flex',
  DIESEL: 'Diesel',
  GNV: 'GNV',
  ELECTRIC: 'Elétrico',
  HYBRID: 'Híbrido',
};

export type ItemType = 'SERVICE' | 'PART';

export const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  SERVICE: 'Serviço',
  PART: 'Peça',
};

export type StockMovementType = 'INBOUND' | 'OUTBOUND' | 'ADJUSTMENT';

export const STOCK_MOVEMENT_LABELS: Record<StockMovementType, string> = {
  INBOUND: 'Entrada',
  OUTBOUND: 'Saída',
  ADJUSTMENT: 'Ajuste',
};

export type QuoteStatus = 'NOT_REQUIRED' | 'PENDING' | 'APPROVED' | 'REJECTED';

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  NOT_REQUIRED: 'Sem orçamento',
  PENDING: 'Aguardando aprovação',
  APPROVED: 'Aprovado',
  REJECTED: 'Recusado',
};

export type WorkOrderStatus =
  | 'OPEN'
  | 'WAITING_DIAGNOSIS'
  | 'IN_DIAGNOSIS'
  | 'WAITING_APPROVAL'
  | 'APPROVED'
  | 'IN_PROGRESS'
  | 'WAITING_PARTS'
  | 'FINISHED'
  | 'DELIVERED'
  | 'CANCELED';

export const WORK_ORDER_STATUS_LABELS: Record<WorkOrderStatus, string> = {
  OPEN: 'Aberta',
  WAITING_DIAGNOSIS: 'Aguardando diagnóstico',
  IN_DIAGNOSIS: 'Em diagnóstico',
  WAITING_APPROVAL: 'Aguardando aprovação',
  APPROVED: 'Aprovada',
  IN_PROGRESS: 'Em execução',
  WAITING_PARTS: 'Aguardando peça',
  FINISHED: 'Finalizada',
  DELIVERED: 'Entregue',
  CANCELED: 'Cancelada',
};

/** Ordem do fluxo, usada para desenhar o funil na mesma sequência da operação. */
export const WORK_ORDER_STATUS_FLOW: WorkOrderStatus[] = [
  'OPEN',
  'WAITING_DIAGNOSIS',
  'IN_DIAGNOSIS',
  'WAITING_APPROVAL',
  'APPROVED',
  'IN_PROGRESS',
  'WAITING_PARTS',
  'FINISHED',
  'DELIVERED',
  'CANCELED',
];

/** Estados finais: a ordem não se move mais a partir deles. */
export const FINAL_WORK_ORDER_STATUSES: WorkOrderStatus[] = ['DELIVERED', 'CANCELED'];

export function isFinalStatus(status: WorkOrderStatus): boolean {
  return FINAL_WORK_ORDER_STATUSES.includes(status);
}

/**
 * Tom visual de cada status.
 *
 * Cor sozinha nunca identifica o status: o rótulo textual acompanha sempre. O tom
 * serve só para dar leitura rápida de "parado", "andando" e "concluído".
 */
export type StatusTone = 'neutral' | 'waiting' | 'progress' | 'done' | 'canceled';

export const WORK_ORDER_STATUS_TONES: Record<WorkOrderStatus, StatusTone> = {
  OPEN: 'neutral',
  WAITING_DIAGNOSIS: 'waiting',
  WAITING_APPROVAL: 'waiting',
  WAITING_PARTS: 'waiting',
  IN_DIAGNOSIS: 'progress',
  APPROVED: 'progress',
  IN_PROGRESS: 'progress',
  FINISHED: 'done',
  DELIVERED: 'done',
  CANCELED: 'canceled',
};

export const QUOTE_STATUS_TONES: Record<QuoteStatus, StatusTone> = {
  NOT_REQUIRED: 'neutral',
  PENDING: 'waiting',
  APPROVED: 'done',
  REJECTED: 'canceled',
};
