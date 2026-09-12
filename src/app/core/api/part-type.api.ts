import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PageQuery, PageResponse } from '../models/common.model';
import { PartTypeRequest, PartTypeResponse } from '../models/part-type.model';
import { toHttpParams } from './http-params.util';

/** Tipos de peça. */
@Injectable({ providedIn: 'root' })
export class PartTypeApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/part-types`;

  list(query: PageQuery = {}): Observable<PageResponse<PartTypeResponse>> {
    return this.http.get<PageResponse<PartTypeResponse>>(this.url, { params: toHttpParams(query) });
  }

  /**
   * Lista completa dos ativos, sem paginação.
   *
   * Seletor e filtro precisam de todos de uma vez: paginar uma lista de escolha
   * esconderia opção válida atrás de um "próxima página" que ninguém espera num
   * campo de seleção.
   */
  listActive(): Observable<PartTypeResponse[]> {
    return this.http.get<PartTypeResponse[]>(`${this.url}/active`);
  }

  getById(id: string): Observable<PartTypeResponse> {
    return this.http.get<PartTypeResponse>(`${this.url}/${id}`);
  }

  create(body: PartTypeRequest): Observable<PartTypeResponse> {
    return this.http.post<PartTypeResponse>(this.url, body);
  }

  update(id: string, body: PartTypeRequest): Observable<PartTypeResponse> {
    return this.http.put<PartTypeResponse>(`${this.url}/${id}`, body);
  }

  changeStatus(id: string, active: boolean): Observable<PartTypeResponse> {
    return this.http.patch<PartTypeResponse>(`${this.url}/${id}/status`, { active });
  }
}
