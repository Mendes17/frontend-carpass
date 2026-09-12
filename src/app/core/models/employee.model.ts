import { Role } from './enums.model';

export interface EmployeeResponse {
  id: string;
  name: string;
  role: Role;
  roleLabel: string;
  specialty: string | null;
  phone: string | null;
  email: string | null;
  userId: string | null;
  hasSystemAccess: boolean;
  active: boolean;
  createdAt: string;
}

export interface EmployeeRequest {
  name: string;
  role: Role;
  specialty?: string | null;
  phone?: string | null;
  email?: string | null;
  userId?: string | null;
}

export interface GrantAccessRequest {
  email: string;
}
