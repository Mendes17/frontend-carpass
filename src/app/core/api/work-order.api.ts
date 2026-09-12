import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PageResponse } from '../models/common.model';
import {
  NoteRequest,
  StatusChangeRequest,
  WorkOrderCreateRequest,
  WorkOrderItemRequest,
  WorkOrderQuery,
  WorkOrderResponse,
  WorkOrderStatusHistoryEntry,
  WorkOrderSummary,
  WorkOrderUpdateRequest,
} from '../models/work-order.model';
import { toHttpParams } from './http-params.util';

/** Ordens de serviço. */
@Injectable({ providedIn: 'root' })
export class WorkOrderApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/work-orders`;

  list(query: WorkOrderQuery = {}): Observable<PageResponse<WorkOrderSummary>> {
    return this.http.get<PageResponse<WorkOrderSummary>>(this.url, { params: toHttpParams(query) });
  }

  getById(id: string): Observable<WorkOrderResponse> {
    return this.http.get<WorkOrderResponse>(`${this.url}/${id}`);
  }

  history(id: string): Observable<WorkOrderStatusHistoryEntry[]> {
    return this.http.get<WorkOrderStatusHistoryEntry[]>(`${this.url}/${id}/history`);
  }

  create(body: WorkOrderCreateRequest): Observable<WorkOrderResponse> {
    return this.http.post<WorkOrderResponse>(this.url, body);
  }

  update(id: string, body: WorkOrderUpdateRequest): Observable<WorkOrderResponse> {
    return this.http.put<WorkOrderResponse>(`${this.url}/${id}`, body);
  }

  // ------------------------------------------------------------------ itens
  /** Adicionar uma peça dá baixa no estoque na hora. */
  addItem(id: string, body: WorkOrderItemRequest): Observable<WorkOrderResponse> {
    return this.http.post<WorkOrderResponse>(`${this.url}/${id}/items`, body);
  }

  updateItem(id: string, itemId: string, body: WorkOrderItemRequest): Observable<WorkOrderResponse> {
    return this.http.put<WorkOrderResponse>(`${this.url}/${id}/items/${itemId}`, body);
  }

  /** Remover devolve a peça ao estoque. */
  removeItem(id: string, itemId: string): Observable<WorkOrderResponse> {
    return this.http.delete<WorkOrderResponse>(`${this.url}/${id}/items/${itemId}`);
  }

  // ----------------------------------------------------------------- status
  changeStatus(id: string, body: StatusChangeRequest): Observable<WorkOrderResponse> {
    return this.http.patch<WorkOrderResponse>(`${this.url}/${id}/status`, body);
  }

  deliver(id: string, body: NoteRequest = {}): Observable<WorkOrderResponse> {
    return this.http.post<WorkOrderResponse>(`${this.url}/${id}/deliver`, body);
  }

  cancel(id: string, body: NoteRequest = {}): Observable<WorkOrderResponse> {
    return this.http.post<WorkOrderResponse>(`${this.url}/${id}/cancel`, body);
  }

  // -------------------------------------------------------------- orçamento
  /** O e-mail é opcional e vale só para este envio. */
  submitQuote(id: string, email: string | null): Observable<WorkOrderResponse> {
    return this.http.post<WorkOrderResponse>(`${this.url}/${id}/quote/submit`, { email });
  }

  /** Reenvia a proposta e derruba o link anterior. */
  resendQuote(id: string, email: string | null): Observable<WorkOrderResponse> {
    return this.http.post<WorkOrderResponse>(`${this.url}/${id}/quote/resend`, { email });
  }

  approveQuote(id: string): Observable<WorkOrderResponse> {
    return this.http.post<WorkOrderResponse>(`${this.url}/${id}/quote/approve`, {});
  }

  rejectQuote(id: string, body: NoteRequest = {}): Observable<WorkOrderResponse> {
    return this.http.post<WorkOrderResponse>(`${this.url}/${id}/quote/reject`, body);
  }

  /** Destrava os itens de uma OS com orçamento já aprovado. */
  reopenQuote(id: string, body: NoteRequest = {}): Observable<WorkOrderResponse> {
    return this.http.post<WorkOrderResponse>(`${this.url}/${id}/quote/reopen`, body);
  }
}
