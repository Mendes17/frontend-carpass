import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { SnackbarService } from '../services/snackbar.service';
import { apiErrorMessage } from './api-error.util';

/**
 * Rotas que não pressupõem sessão.
 *
 * Nelas um 401 ou 403 não significa "sessão expirada" — significa credencial
 * errada, no caso do login, ou link inválido, no caso do orçamento do cliente.
 * Sem esta lista, alguém que abrisse o link do orçamento e recebesse um 401
 * veria "sua sessão expirou" e seria mandado para uma tela de login que não lhe
 * diz respeito: ele nunca teve conta.
 */
const PUBLIC_PATHS = ['/auth/login', '/auth/register', '/auth/password/', '/public/'];

/**
 * Tratamento global de erro HTTP.
 *
 * Cuida do que é sempre igual — sessão expirada, falta de permissão e falha de
 * servidor — para que nenhuma tela precise repetir isso. Erros de negócio e de
 * validação seguem para o componente, que sabe onde exibi-los no formulário.
 */
export const errorInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const snackbar = inject(SnackbarService);

  return next(request).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || !request.url.startsWith(environment.apiUrl)) {
        return throwError(() => error);
      }

      const isPublicCall = PUBLIC_PATHS.some((path) => request.url.includes(path));

      if (error.status === 401 && !isPublicCall) {
        // Token vencido ou revogado: derruba a sessão em vez de deixar a tela
        // insistindo em chamadas que vão falhar todas.
        snackbar.warning('Sua sessão expirou. Entre novamente.');
        auth.logout();
        return throwError(() => error);
      }

      if (error.status === 403 && !isPublicCall) {
        snackbar.error('Você não tem permissão para executar esta ação.');
        return throwError(() => error);
      }

      if (error.status === 0 || error.status >= 500) {
        snackbar.error(apiErrorMessage(error));
        return throwError(() => error);
      }

      // 400, 404, 409 e 422 são específicos da tela: quem chamou decide o que dizer.
      return throwError(() => error);
    }),
  );
};
