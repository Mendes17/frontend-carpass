import { Role } from '../core/models/enums.model';

/** Um item do menu principal. */
export interface NavItem {
  icon: string;
  label: string;
  route: string;
  /** Vazio significa visível para toda a equipe. */
  roles?: Role[];
  /**
   * Item financeiro: além do papel, depende da chave que o dono liga na
   * oficina. O papel sozinho não responde para o gerente.
   */
  finance?: boolean;
}

/**
 * Menu principal.
 *
 * A restrição por papel aqui é só para não oferecer um caminho que a pessoa não
 * pode seguir. Quem realmente barra o acesso é o backend, a cada requisição.
 */
export const NAV_ITEMS: NavItem[] = [
  { icon: 'dashboard', label: 'Painel', route: '/painel' },
  { icon: 'groups', label: 'Clientes', route: '/clientes' },
  { icon: 'directions_car', label: 'Veículos', route: '/veiculos' },
  { icon: 'receipt_long', label: 'Ordens de serviço', route: '/ordens' },
  { icon: 'build', label: 'Catálogo de serviços', route: '/servicos' },
  { icon: 'inventory_2', label: 'Peças', route: '/pecas' },
  // Logo abaixo de Peças: é cadastro de apoio ao estoque, e quem procura por
  // ele está pensando em peça, não em configuração.
  { icon: 'category', label: 'Tipos de peça', route: '/tipos-de-peca' },
  // O financeiro vem depois da operação: é o resumo do que aconteceu nas telas
  // acima, e não o começo do dia de ninguém.
  { icon: 'insights', label: 'Financeiro', route: '/financeiro', roles: ['OWNER', 'MANAGER'], finance: true },
  { icon: 'receipt_long', label: 'Despesas', route: '/despesas', roles: ['OWNER', 'MANAGER'], finance: true },
  { icon: 'badge', label: 'Equipe', route: '/equipe', roles: ['OWNER', 'MANAGER'] },
  { icon: 'business', label: 'Minha oficina', route: '/oficina', roles: ['OWNER', 'MANAGER'] },
  { icon: 'person', label: 'Meu perfil', route: '/perfil' },
];
