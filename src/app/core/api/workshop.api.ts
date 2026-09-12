import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { CreateWorkshopRequest } from '../models/auth.model';
import { UpdateWorkshopRequest, WorkshopResponse } from '../models/workshop.model';

/** Cadastro da própria oficina. */
@Injectable({ providedIn: 'root' })
export class WorkshopApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/workshop`;

  get(): Observable<WorkshopResponse> {
    return this.http.get<WorkshopResponse>(this.url);
  }

  /**
   * Cria uma oficina para quem já está autenticado.
   *
   * O caminho de quem saiu de uma oficina e vai abrir a própria. Não passa por
   * confirmação de e-mail porque não há o que confirmar: o login já provou que
   * a pessoa é dona daquela conta.
   */
  create(body: CreateWorkshopRequest): Observable<WorkshopResponse> {
    return this.http.post<WorkshopResponse>(this.url, body);
  }

  update(body: UpdateWorkshopRequest): Observable<WorkshopResponse> {
    return this.http.put<WorkshopResponse>(this.url, body);
  }

  /**
   * Define se o gerente enxerga o financeiro.
   *
   * Endpoint separado do cadastro porque o cadastro é editável pelo gerente. Se
   * esta chave viajasse dentro do `PUT` acima, o gerente se concederia acesso
   * ao financeiro salvando a própria tela. Só o dono passa.
   */
  updateFinanceAccess(managerCanSeeFinance: boolean): Observable<WorkshopResponse> {
    return this.http.patch<WorkshopResponse>(`${this.url}/finance-access`, { managerCanSeeFinance });
  }
}
