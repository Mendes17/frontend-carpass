import { Role } from './enums.model';

/** Usuário autenticado, como o backend devolve em /me e no login. */
export interface UserResponse {
  id: string;
  firstName: string;
  lastName: string | null;
  fullName: string;
  email: string;
  phone: string | null;
  /**
   * O papel na oficina **da sessão atual** — não da pessoa.
   *
   * Quem tem vínculo em duas oficinas tem um papel em cada uma. Vem nulo,
   * junto com a oficina, quando a pessoa está autenticada mas fora de qualquer
   * oficina: o caso de quem saiu de uma e ainda não criou a própria.
   */
  role: Role | null;
  roleLabel: string | null;
  active: boolean;
  workshopId: string | null;
  workshopName: string | null;
}

export interface UpdateProfileRequest {
  firstName: string;
  lastName?: string | null;
  email: string;
  phone?: string | null;
}
