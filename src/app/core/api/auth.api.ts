import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  ForgotPasswordRequest,
  LoginRequest,
  LoginResponse,
  RegisterWorkshopRequest,
  ResetPasswordRequest,
  WorkshopOption,
} from '../models/auth.model';
import { MessageResponse } from '../models/common.model';
import { UserResponse } from '../models/user.model';

/** Autenticação e sessão. */
@Injectable({ providedIn: 'root' })
export class AuthApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/auth`;

  login(body: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.url}/login`, body);
  }

  /**
   * Troca a oficina da sessão e devolve um token escopado nela.
   *
   * O id vai no corpo, mas não autoriza nada por si só: o servidor confere que
   * existe vínculo ativo entre esta pessoa e esta oficina antes de assinar
   * qualquer token. Oficina de que ela não é membro responde 404.
   */
  selectWorkshop(workshopId: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.url}/session/workshop`, { workshopId });
  }

  /** Oficinas em que a pessoa pode entrar. Alimenta o seletor de troca. */
  myWorkshops(): Observable<WorkshopOption[]> {
    return this.http.get<WorkshopOption[]>(`${this.url}/session/workshops`);
  }

  registerWorkshop(body: RegisterWorkshopRequest): Observable<UserResponse> {
    return this.http.post<UserResponse>(`${this.url}/register`, body);
  }

  forgotPassword(body: ForgotPasswordRequest): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.url}/password/forgot`, body);
  }

  resetPassword(body: ResetPasswordRequest): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.url}/password/reset`, body);
  }
}
