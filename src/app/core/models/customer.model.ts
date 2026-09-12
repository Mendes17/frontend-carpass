import { Address } from './common.model';
import { CustomerType } from './enums.model';

export interface CustomerResponse {
  id: string;
  type: CustomerType;
  typeLabel: string;
  name: string;
  document: string | null;
  phone: string | null;
  email: string | null;
  address: Address | null;
  notes: string | null;
  active: boolean;
  createdAt: string;
}

export interface CustomerRequest {
  type: CustomerType;
  name: string;
  document?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: Address | null;
  notes?: string | null;
}
