import { HttpParams } from '@angular/common/http';

/**
 * Monta os parâmetros de consulta ignorando o que está vazio.
 *
 * Sem isso, um filtro não preenchido viraria `?q=null` na URL e o backend
 * passaria a buscar pelo texto "null".
 */
export function toHttpParams(source: object): HttpParams {
  let params = new HttpParams();

  // O parâmetro é `object` e não `Record<string, unknown>` porque interfaces
  // declaradas não trazem índice de string, e todos os filtros são interfaces.
  for (const [key, value] of Object.entries(source as Record<string, unknown>)) {
    if (value === null || value === undefined || value === '') {
      continue;
    }
    params = params.set(key, String(value));
  }

  return params;
}
