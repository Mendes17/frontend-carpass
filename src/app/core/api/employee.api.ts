import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PageQuery, PageResponse } from '../models/common.model';
import { EmployeeRequest, EmployeeResponse, GrantAccessRequest } from '../models/employee.model';
import { Role } from '../models/enums.model';
import { toHttpParams } from './http-params.util';

export interface EmployeeQuery extends PageQuery {
  role?: Role | null;
}

/** Equipe da oficina. */
@Injectable({ providedIn: 'root' })
export class EmployeeApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/employees`;

  list(query: EmployeeQuery = {}): Observable<PageResponse<EmployeeResponse>> {
    return this.http.get<PageResponse<EmployeeResponse>>(this.url, { params: toHttpParams(query) });
  }

  /** Mecânicos ativos, para o seletor de responsável da ordem de serviço. */
  mechanics(): Observable<EmployeeResponse[]> {
    return this.http.get<EmployeeResponse[]>(`${this.url}/mechanics`);
  }

  getById(id: string): Observable<EmployeeResponse> {
    return this.http.get<EmployeeResponse>(`${this.url}/${id}`);
  }

  create(body: EmployeeRequest): Observable<EmployeeResponse> {
    return this.http.post<EmployeeResponse>(this.url, body);
  }

  update(id: string, body: EmployeeRequest): Observable<EmployeeResponse> {
    return this.http.put<EmployeeResponse>(`${this.url}/${id}`, body);
  }

  /**
   * Cria a conta de acesso e dispara o convite de primeiro acesso.
   *
   * A senha nunca trafega por aqui: quem define é o próprio funcionário, pelo
   * link que chega no e-mail dele.
   */
  grantAccess(id: string, body: GrantAccessRequest): Observable<EmployeeResponse> {
    return this.http.post<EmployeeResponse>(`${this.url}/${id}/access`, body);
  }

  changeStatus(id: string, active: boolean): Observable<EmployeeResponse> {
    return this.http.patch<EmployeeResponse>(`${this.url}/${id}/status`, { active });
  }
}
