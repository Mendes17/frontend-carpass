export interface ServiceCatalogResponse {
  id: string;
  name: string;
  description: string | null;
  defaultPrice: number | null;
  estimatedMinutes: number | null;
  active: boolean;
  createdAt: string;
}

export interface ServiceCatalogRequest {
  name: string;
  description?: string | null;
  defaultPrice?: number | null;
  estimatedMinutes?: number | null;
}
