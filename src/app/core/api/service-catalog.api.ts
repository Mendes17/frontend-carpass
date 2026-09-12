import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PageQuery, PageResponse } from '../models/common.model';
import { ServiceCatalogRequest, ServiceCatalogResponse } from '../models/service-catalog.model';
import { toHttpParams } from './http-params.util';

/** Catálogo de serviços oferecidos pela oficina. */
@Injectable({ providedIn: 'root' })
export class ServiceCatalogApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/services`;

  list(query: PageQuery = {}): Observable<PageResponse<ServiceCatalogResponse>> {
    return this.http.get<PageResponse<ServiceCatalogResponse>>(this.url, { params: toHttpParams(query) });
  }

  getById(id: string): Observable<ServiceCatalogResponse> {
    return this.http.get<ServiceCatalogResponse>(`${this.url}/${id}`);
  }

  create(body: ServiceCatalogRequest): Observable<ServiceCatalogResponse> {
    return this.http.post<ServiceCatalogResponse>(this.url, body);
  }

  update(id: string, body: ServiceCatalogRequest): Observable<ServiceCatalogResponse> {
    return this.http.put<ServiceCatalogResponse>(`${this.url}/${id}`, body);
  }

  changeStatus(id: string, active: boolean): Observable<ServiceCatalogResponse> {
    return this.http.patch<ServiceCatalogResponse>(`${this.url}/${id}/status`, { active });
  }
}
