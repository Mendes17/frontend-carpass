import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PublicQuoteResponse } from '../models/quote.model';

/**
 * Orçamento visto pelo cliente, sem login.
 *
 * O token do link é a autorização — por isso ele vai no caminho e nenhum
 * identificador interno da oficina aparece na URL.
 */
@Injectable({ providedIn: 'root' })
export class PublicQuoteApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/public/quotes`;

  find(token: string): Observable<PublicQuoteResponse> {
    return this.http.get<PublicQuoteResponse>(`${this.url}/${token}`);
  }

  approve(token: string): Observable<PublicQuoteResponse> {
    return this.http.post<PublicQuoteResponse>(`${this.url}/${token}/approve`, {});
  }

  reject(token: string, note: string | null): Observable<PublicQuoteResponse> {
    return this.http.post<PublicQuoteResponse>(`${this.url}/${token}/reject`, { note });
  }
}
