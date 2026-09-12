import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AnnualFinanceResponse,
  FinancePeriodsResponse,
  MonthlyFinanceResponse,
} from '../models/finance.model';
import { toHttpParams } from './http-params.util';

/**
 * Painel financeiro.
 *
 * Nenhum cálculo acontece aqui. Bruto, despesas, líquido, comparação e fatias
 * por categoria chegam prontos do servidor — a tela só apresenta.
 */
@Injectable({ providedIn: 'root' })
export class FinanceApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/finance`;

  monthly(year: number, month: number): Observable<MonthlyFinanceResponse> {
    return this.http.get<MonthlyFinanceResponse>(`${this.url}/monthly`, {
      params: toHttpParams({ year, month }),
    });
  }

  annual(year: number): Observable<AnnualFinanceResponse> {
    return this.http.get<AnnualFinanceResponse>(`${this.url}/annual`, {
      params: toHttpParams({ year }),
    });
  }

  /**
   * Períodos disponíveis no seletor.
   *
   * Pedidos uma vez ao abrir a tela: eles não mudam enquanto a pessoa navega
   * entre os meses.
   */
  periods(): Observable<FinancePeriodsResponse> {
    return this.http.get<FinancePeriodsResponse>(`${this.url}/periods`);
  }
}
