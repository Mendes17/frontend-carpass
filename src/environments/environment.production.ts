/**
 * Configuração de produção.
 *
 * O endereço da API é relativo de propósito: assim o mesmo bundle serve qualquer
 * domínio, sem precisar recompilar por ambiente.
 */
export const environment = {
  production: true,
  apiUrl: '/api/v1',
};
