import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { Role } from '../models/enums.model';
import { SnackbarService } from '../services/snackbar.service';
import { AuthService } from './auth.service';

/**
 * Restringe a rota a determinados papéis.
 *
 * Isto é conveniência de navegação, não segurança: quem decide de verdade é o
 * backend, que valida o papel em cada requisição. Aqui só evitamos levar a pessoa
 * até uma tela que ela não poderia usar.
 */
export function roleGuard(...allowed: Role[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const snackbar = inject(SnackbarService);

    if (auth.hasAnyRole(...allowed)) {
      return true;
    }

    snackbar.error('Você não tem permissão para acessar esta área.');
    return router.createUrlTree(['/painel']);
  };
}
