import { Address } from './common.model';
import { Role } from './enums.model';
import { UserResponse } from './user.model';

export interface LoginRequest {
  email: string;
  password: string;
}

/** Uma oficina em que a pessoa pode entrar, com o papel que ela tem lá. */
export interface WorkshopOption {
  workshopId: string;
  workshopName: string;
  role: Role;
  roleLabel: string;
}

/**
 * Resposta do login.
 *
 * Traz o usuário junto do token para a aplicação já montar o menu e as permissões
 * sem uma segunda chamada.
 *
 * Três desfechos possíveis:
 *
 * - **Um vínculo**: `user.workshopId` vem preenchido e a pessoa entra direto.
 * - **Vários vínculos**: `user.workshopId` vem nulo e `workshops` traz as opções;
 *   a tela pede a escolha e chama `selectWorkshop`.
 * - **Nenhum vínculo**: os dois vêm vazios. É quem saiu de uma oficina e ainda
 *   não tem a própria — entra, não enxerga dado de oficina nenhuma, e o caminho
 *   oferecido é criar a dele.
 */
export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: UserResponse;
  workshops: WorkshopOption[];
}

/** Dados de uma oficina nova, criada por quem já está autenticado. */
export interface CreateWorkshopRequest {
  tradeName: string;
  corporateName?: string | null;
  cnpj: string;
  workshopPhone?: string | null;
  workshopEmail?: string | null;
  address?: Address | null;
}

/** Cadastro inicial: cria a oficina e o usuário proprietário de uma vez. */
export interface RegisterWorkshopRequest {
  tradeName: string;
  corporateName?: string | null;
  cnpj: string;
  workshopPhone?: string | null;
  workshopEmail?: string | null;
  address?: Address | null;
  firstName: string;
  lastName?: string | null;
  email: string;
  phone?: string | null;
  password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}
