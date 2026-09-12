/**
 * Tipos compartilhados por toda a API.
 */

/** Envelope de paginacao devolvido pelo backend. */
export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

/** Pagina vazia, util como estado inicial de uma listagem. */
export function emptyPage<T>(size = 20): PageResponse<T> {
  return { content: [], page: 0, size, totalElements: 0, totalPages: 0, first: true, last: true };
}

/**
 * Corpo de erro padronizado da API.
 *
 * O backend devolve sempre este formato, inclusive nos erros de protocolo, entao
 * o frontend tem um unico contrato de erro para tratar.
 */
export interface ApiError {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path?: string;
  details?: FieldErrorDetail[];
}

/** Erro de validacao de um campo especifico (acompanha o 422). */
export interface FieldErrorDetail {
  field: string;
  message: string;
}

export interface Address {
  zipCode?: string | null;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
}

/** Parametros de listagem aceitos por todos os endpoints paginados. */
export interface PageQuery {
  page?: number;
  size?: number;
  sort?: string;
  q?: string | null;
  active?: boolean | null;
}

export interface MessageResponse {
  message: string;
}

export interface ActiveStatusRequest {
  active: boolean;
}
