import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PageQuery, PageResponse } from '../models/common.model';
import {
  ExpenseCategoryRequest,
  ExpenseCategoryResponse,
  ExpenseRequest,
  ExpenseResponse,
} from '../models/expense.model';
import { toHttpParams } from './http-params.util';

export interface ExpenseQuery extends PageQuery {
  categoryId?: string | null;
  /** Primeiro dia considerado, em ISO (yyyy-MM-dd). */
  from?: string | null;
  /** Último dia considerado, inclusive. */
  to?: string | null;
}

/** Despesas e suas categorias. */
@Injectable({ providedIn: 'root' })
export class ExpenseApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/expenses`;

  list(query: ExpenseQuery = {}): Observable<PageResponse<ExpenseResponse>> {
    return this.http.get<PageResponse<ExpenseResponse>>(this.url, { params: toHttpParams(query) });
  }

  /**
   * Total do que o filtro alcança.
   *
   * Chamada separada porque o total não pertence à página: com vinte
   * lançamentos por vez, somar o que chegou daria um número que muda ao virar
   * a página.
   */
  total(query: ExpenseQuery = {}): Observable<number> {
    return this.http
      .get<{ total: number }>(`${this.url}/total`, { params: toHttpParams(query) })
      .pipe(map((resposta) => resposta.total));
  }

  getById(id: string): Observable<ExpenseResponse> {
    return this.http.get<ExpenseResponse>(`${this.url}/${id}`);
  }

  create(body: ExpenseRequest): Observable<ExpenseResponse> {
    return this.http.post<ExpenseResponse>(this.url, body);
  }

  update(id: string, body: ExpenseRequest): Observable<ExpenseResponse> {
    return this.http.put<ExpenseResponse>(`${this.url}/${id}`, body);
  }

  /** Exclui de verdade: despesa lançada errada precisa sair do resultado. */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  // ------------------------------------------------------- categorias
  listCategories(query: PageQuery = {}): Observable<PageResponse<ExpenseCategoryResponse>> {
    return this.http.get<PageResponse<ExpenseCategoryResponse>>(`${this.url}/categories`, {
      params: toHttpParams(query),
    });
  }

  listActiveCategories(): Observable<ExpenseCategoryResponse[]> {
    return this.http.get<ExpenseCategoryResponse[]>(`${this.url}/categories/active`);
  }

  getCategoryById(id: string): Observable<ExpenseCategoryResponse> {
    return this.http.get<ExpenseCategoryResponse>(`${this.url}/categories/${id}`);
  }

  createCategory(body: ExpenseCategoryRequest): Observable<ExpenseCategoryResponse> {
    return this.http.post<ExpenseCategoryResponse>(`${this.url}/categories`, body);
  }

  updateCategory(id: string, body: ExpenseCategoryRequest): Observable<ExpenseCategoryResponse> {
    return this.http.put<ExpenseCategoryResponse>(`${this.url}/categories/${id}`, body);
  }

  changeCategoryStatus(id: string, active: boolean): Observable<ExpenseCategoryResponse> {
    return this.http.patch<ExpenseCategoryResponse>(`${this.url}/categories/${id}/status`, { active });
  }
}
