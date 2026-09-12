/**
 * O que a peça é: óleo de motor, óleo de câmbio, vela, bobina, aditivo...
 *
 * É cadastro da oficina, não lista fixa: cada uma trabalha com um conjunto
 * diferente, e amanhã aparece um tipo que ninguém previu. Toda oficina nasce
 * com uma lista padrão e edita a partir dela.
 */
export interface PartTypeResponse {
  id: string;
  name: string;
  description: string | null;
  /**
   * Quantas peças ativas usam este tipo.
   *
   * Vai junto para a tela poder avisar o que sai de vista ao desativar —
   * desativar "Vela" com 30 velas no estoque não pode ser um clique sem
   * consequência aparente.
   */
  partCount: number;
  active: boolean;
  createdAt: string;
}

export interface PartTypeRequest {
  name: string;
  description?: string | null;
}

/**
 * Uma marca presente no estoque.
 *
 * A contagem e o saldo vêm junto porque são a parte útil da resposta: ao
 * perguntar "quais marcas de óleo de motor eu tenho?", saber que de uma sobrou
 * 1 litro e de outra sobraram 24 é o que decide o próximo passo.
 */
export interface PartManufacturerResponse {
  name: string;
  partCount: number;
  stockQuantity: number;
}
