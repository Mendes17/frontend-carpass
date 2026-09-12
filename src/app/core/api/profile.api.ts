import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ChangePasswordRequest } from '../models/auth.model';
import { UpdateProfileRequest, UserResponse } from '../models/user.model';

/**
 * Conta do próprio usuário.
 *
 * Nenhum método recebe id: o alvo é sempre quem está autenticado, o que elimina
 * a possibilidade de alterar a conta de outra pessoa trocando um parâmetro.
 */
@Injectable({ providedIn: 'root' })
export class ProfileApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/me`;

  me(): Observable<UserResponse> {
    return this.http.get<UserResponse>(this.url);
  }

  update(body: UpdateProfileRequest): Observable<UserResponse> {
    return this.http.put<UserResponse>(this.url, body);
  }

  changePassword(body: ChangePasswordRequest): Observable<void> {
    return this.http.patch<void>(`${this.url}/password`, body);
  }
}
