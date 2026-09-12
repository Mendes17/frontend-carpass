import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';

/** Bloqueia rotas internas para quem não está autenticado. */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  // Guarda o destino para voltar até ele depois do login.
  return router.createUrlTree(['/entrar'], { queryParams: { redirect: state.url } });
};

/** Mantém quem já entrou fora das telas de login e cadastro. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.isAuthenticated() ? router.createUrlTree(['/painel']) : true;
};

/**
 * Exige que a sessão esteja dentro de uma oficina.
 *
 * "Autenticado" e "dentro de uma oficina" passaram a ser coisas diferentes
 * quando o vínculo virou uma entidade própria. Sem esta trava, quem entra sem
 * vínculo cairia no painel e veria uma tela cheia de erros — o backend responde
 * 403 em tudo que é operacional — em vez do caminho que resolve a situação dele.
 *
 * Como sempre, isto é conveniência de navegação, não segurança: quem barra de
 * verdade é o backend, que confere o vínculo a cada requisição.
 */
export const workshopGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.hasWorkshop()) {
    return true;
  }

  return router.createUrlTree([auth.workshops().length > 0 ? '/escolher-oficina' : '/nova-oficina']);
};
