import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';

/**
 * Injeta o token nas chamadas à nossa API.
 *
 * O teste é pela base configurada, e não por uma string fixa de endereço: assim o
 * token continua indo em qualquer ambiente, e nunca vaza para um serviço de
 * terceiros que a aplicação venha a consumir.
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const token = inject(AuthService).token;
  const isApiCall = request.url.startsWith(environment.apiUrl);

  if (!token || !isApiCall) {
    return next(request);
  }

  return next(
    request.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    }),
  );
};
