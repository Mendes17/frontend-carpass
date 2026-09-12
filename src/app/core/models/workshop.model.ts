import { Address } from './common.model';

export interface WorkshopResponse {
  id: string;
  tradeName: string;
  corporateName: string | null;
  cnpj: string;
  phone: string | null;
  email: string | null;
  logoUrl: string | null;
  address: Address | null;
  active: boolean;
  /** Se o gerente enxerga o financeiro. Só o dono altera, por endpoint próprio. */
  managerCanSeeFinance: boolean;
  /**
   * Depois de quantas horas paradas uma OS aberta é encerrada sozinha.
   *
   * Null desliga a rotina, e é o padrão. O relógio conta a partir da última
   * movimentação, não da abertura.
   */
  autoCloseOpenOrdersHours: number | null;
  createdAt: string;
  ownerId: string | null;
}

export interface UpdateWorkshopRequest {
  tradeName: string;
  corporateName?: string | null;
  phone?: string | null;
  email?: string | null;
  logoUrl?: string | null;
  /** Null desliga o encerramento automático. Entre 1 e 720 horas. */
  autoCloseOpenOrdersHours?: number | null;
  address?: Address | null;
}
