import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PageQuery, PageResponse } from '../models/common.model';
import { PartManufacturerResponse } from '../models/part-type.model';
import {
  PartRequest,
  PartResponse,
  StockMovementRequest,
  StockMovementResponse,
} from '../models/part.model';
import { toHttpParams } from './http-params.util';

export interface PartQuery extends PageQuery {
  /** Só o que está no estoque mínimo ou abaixo dele. */
  lowStock?: boolean | null;
  /** Tipo de peça: óleo de motor, vela, bobina... */
  typeId?: string | null;
  /** Marca, escolhida da lista devolvida por `manufacturers`. */
  brand?: string | null;
}

/** Peças e estoque. */
@Injectable({ providedIn: 'root' })
export class PartApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/parts`;

  list(query: PartQuery = {}): Observable<PageResponse<PartResponse>> {
    return this.http.get<PageResponse<PartResponse>>(this.url, { params: toHttpParams(query) });
  }

  /**
   * Marcas presentes no estoque, opcionalmente de um tipo só.
   *
   * A lista vem do servidor, e não do que a tela já carregou: a listagem é
   * paginada, então montar o filtro com as marcas da página atual ofereceria só
   * as primeiras peças — e filtro que esconde opção válida é pior que filtro
   * nenhum.
   */
  manufacturers(typeId?: string | null): Observable<PartManufacturerResponse[]> {
    return this.http.get<PartManufacturerResponse[]>(`${this.url}/manufacturers`, {
      params: toHttpParams({ typeId }),
    });
  }

  getById(id: string): Observable<PartResponse> {
    return this.http.get<PartResponse>(`${this.url}/${id}`);
  }

  create(body: PartRequest): Observable<PartResponse> {
    return this.http.post<PartResponse>(this.url, body);
  }

  update(id: string, body: PartRequest): Observable<PartResponse> {
    return this.http.put<PartResponse>(`${this.url}/${id}`, body);
  }

  changeStatus(id: string, active: boolean): Observable<PartResponse> {
    return this.http.patch<PartResponse>(`${this.url}/${id}/status`, { active });
  }

  /** Entrada, saída ou ajuste. É o único caminho que altera saldo. */
  registerStockMovement(id: string, body: StockMovementRequest): Observable<PartResponse> {
    return this.http.post<PartResponse>(`${this.url}/${id}/stock-movements`, body);
  }

  stockMovements(id: string, query: PageQuery = {}): Observable<PageResponse<StockMovementResponse>> {
    return this.http.get<PageResponse<StockMovementResponse>>(`${this.url}/${id}/stock-movements`, {
      params: toHttpParams(query),
    });
  }
}
