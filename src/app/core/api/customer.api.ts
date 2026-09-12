import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { CustomerRequest, CustomerResponse } from '../models/customer.model';
import { PageQuery, PageResponse } from '../models/common.model';
import { VehicleResponse } from '../models/vehicle.model';
import { toHttpParams } from './http-params.util';

/** Clientes da oficina. */
@Injectable({ providedIn: 'root' })
export class CustomerApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/customers`;

  list(query: PageQuery = {}): Observable<PageResponse<CustomerResponse>> {
    return this.http.get<PageResponse<CustomerResponse>>(this.url, { params: toHttpParams(query) });
  }

  getById(id: string): Observable<CustomerResponse> {
    return this.http.get<CustomerResponse>(`${this.url}/${id}`);
  }

  vehicles(id: string): Observable<VehicleResponse[]> {
    return this.http.get<VehicleResponse[]>(`${this.url}/${id}/vehicles`);
  }

  create(body: CustomerRequest): Observable<CustomerResponse> {
    return this.http.post<CustomerResponse>(this.url, body);
  }

  update(id: string, body: CustomerRequest): Observable<CustomerResponse> {
    return this.http.put<CustomerResponse>(`${this.url}/${id}`, body);
  }

  /** Ativa ou desativa. Não existe exclusão física: o histórico depende do cadastro. */
  changeStatus(id: string, active: boolean): Observable<CustomerResponse> {
    return this.http.patch<CustomerResponse>(`${this.url}/${id}/status`, { active });
  }
}
