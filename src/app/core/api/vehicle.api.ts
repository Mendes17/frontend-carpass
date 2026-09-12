import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PageQuery, PageResponse } from '../models/common.model';
import {
  MaintenanceRecordRequest,
  VehicleHistoryEntry,
  VehicleRequest,
  VehicleResponse,
} from '../models/vehicle.model';
import { toHttpParams } from './http-params.util';

export interface VehicleQuery extends PageQuery {
  customerId?: string | null;
}

/** Veículos atendidos pela oficina. */
@Injectable({ providedIn: 'root' })
export class VehicleApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/vehicles`;

  list(query: VehicleQuery = {}): Observable<PageResponse<VehicleResponse>> {
    return this.http.get<PageResponse<VehicleResponse>>(this.url, { params: toHttpParams(query) });
  }

  getById(id: string): Observable<VehicleResponse> {
    return this.http.get<VehicleResponse>(`${this.url}/${id}`);
  }

  create(body: VehicleRequest): Observable<VehicleResponse> {
    return this.http.post<VehicleResponse>(this.url, body);
  }

  update(id: string, body: VehicleRequest): Observable<VehicleResponse> {
    return this.http.put<VehicleResponse>(`${this.url}/${id}`, body);
  }

  changeStatus(id: string, active: boolean): Observable<VehicleResponse> {
    return this.http.patch<VehicleResponse>(`${this.url}/${id}/status`, { active });
  }

  /** Linha do tempo: ordens de serviço concluídas mais lançamentos manuais. */
  history(id: string): Observable<VehicleHistoryEntry[]> {
    return this.http.get<VehicleHistoryEntry[]>(`${this.url}/${id}/history`);
  }

  addHistoryRecord(id: string, body: MaintenanceRecordRequest): Observable<VehicleHistoryEntry> {
    return this.http.post<VehicleHistoryEntry>(`${this.url}/${id}/history`, body);
  }

  removeHistoryRecord(id: string, recordId: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}/history/${recordId}`);
  }
}
