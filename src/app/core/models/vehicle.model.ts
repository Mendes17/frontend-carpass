import { FuelType } from './enums.model';

export interface VehicleResponse {
  id: string;
  customerId: string;
  customerName: string;
  plate: string;
  brand: string;
  model: string;
  manufactureYear: number | null;
  modelYear: number | null;
  mileage: number | null;
  fuelType: FuelType | null;
  fuelTypeLabel: string | null;
  /** Carro, moto ou caminhão. Vazio nos veículos anteriores ao seletor da FIPE. */
  vehicleKind: 'CAR' | 'MOTORCYCLE' | 'TRUCK' | null;
  /** Código na tabela FIPE, quando o cadastro veio de lá. Vazio no manual. */
  fipeCode: string | null;
  chassis: string | null;
  renavam: string | null;
  color: string | null;
  notes: string | null;
  active: boolean;
  createdAt: string;
}

export interface VehicleRequest {
  customerId: string;
  plate: string;
  brand: string;
  model: string;
  manufactureYear?: number | null;
  modelYear?: number | null;
  mileage?: number | null;
  fuelType?: FuelType | null;
  vehicleKind?: string | null;
  fipeCode?: string | null;
  chassis?: string | null;
  renavam?: string | null;
  color?: string | null;
  notes?: string | null;
}

/** Um evento na linha do tempo de manutenção do veículo. */
export interface VehicleHistoryEntry {
  source: 'WORK_ORDER' | 'MANUAL';
  id: string;
  workOrderId: string | null;
  workOrderNumber: number | null;
  date: string | null;
  mileage: number | null;
  description: string;
  services: string[];
  parts: string[];
  performedBy: string | null;
  amount: number | null;
  notes: string | null;
}

/** Lançamento manual de um serviço feito fora desta oficina. */
export interface MaintenanceRecordRequest {
  serviceDate: string;
  mileage?: number | null;
  description: string;
  performedBy?: string | null;
  amount?: number | null;
  notes?: string | null;
}
