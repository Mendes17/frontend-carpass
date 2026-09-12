/** Orçamento como o cliente vê, fora do sistema. */
export interface PublicQuoteItem {
  description: string;
  typeLabel: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface PublicQuoteResponse {
  workshopName: string;
  workshopPhone: string | null;
  orderNumber: number;
  customerName: string;
  vehiclePlate: string;
  vehicleDescription: string;
  reportedProblem: string | null;
  items: PublicQuoteItem[];
  servicesTotal: number | null;
  partsTotal: number | null;
  discount: number | null;
  totalAmount: number | null;
  estimatedDeliveryDate: string | null;
  status: string;
  /** Enquanto verdadeiro, a tela oferece os botões de decisão. */
  pending: boolean;
}

/** Endereço informado só para aquele envio; não altera o cadastro. */
export interface QuoteDeliveryRequest {
  email: string | null;
}
