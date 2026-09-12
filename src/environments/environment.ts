/**
 * Configuração de desenvolvimento.
 *
 * A base da API fica em um lugar só: nenhum serviço monta URL com string solta,
 * o que era o motivo do interceptor antigo procurar "localhost:8080" no endereço
 * e parar de funcionar fora da máquina do desenvolvedor.
 */
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080/api/v1',
};
