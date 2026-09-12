import { HttpErrorResponse } from '@angular/common/http';

import { ApiError, FieldErrorDetail } from '../models/common.model';

/** Mensagem usada quando nem o servidor respondeu. */
const OFFLINE_MESSAGE = 'Não foi possível falar com o servidor. Verifique sua conexão e tente novamente.';

const FALLBACK_MESSAGE = 'Não foi possível concluir a operação. Tente novamente.';

/**
 * Extrai a mensagem amigável de um erro HTTP.
 *
 * O backend devolve sempre o mesmo formato de erro, então aqui só precisamos
 * cobrir o caso em que a resposta nem chegou.
 */
export function apiErrorMessage(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) {
    return FALLBACK_MESSAGE;
  }

  // status 0 = requisição não chegou ao servidor (offline, CORS, servidor parado)
  if (error.status === 0) {
    return OFFLINE_MESSAGE;
  }

  const body = error.error as ApiError | null;
  return body?.message?.trim() || FALLBACK_MESSAGE;
}

/** Erros campo a campo do 422, para marcar os campos do formulário. */
export function apiFieldErrors(error: unknown): FieldErrorDetail[] {
  if (!(error instanceof HttpErrorResponse)) {
    return [];
  }
  const body = error.error as ApiError | null;
  return body?.details ?? [];
}
