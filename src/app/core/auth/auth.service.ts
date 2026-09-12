import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

import { AuthApi } from '../api/auth.api';
import { ProfileApi } from '../api/profile.api';
import { LoginRequest, LoginResponse, WorkshopOption } from '../models/auth.model';
import { Role } from '../models/enums.model';
import { UserResponse } from '../models/user.model';

const STORAGE_KEY = 'carpass.session';

interface StoredSession {
  token: string;
  user: UserResponse;
  /** Momento em que o token expira, em milissegundos desde a época. */
  expiresAt: number;
  /** Oficinas em que esta pessoa pode entrar. Vazio = nenhuma. */
  workshops: WorkshopOption[];
}

/**
 * Sessão do usuário.
 *
 * <h2>Onde o token mora</h2>
 *
 * O token fica no localStorage, que é o compromisso usual para uma SPA sem
 * backend de sessão: sobrevive ao recarregar a página, ao custo de ser acessível
 * por JavaScript. Guardamos junto o instante de expiração para descartar a sessão
 * vencida na abertura, em vez de descobrir isso no primeiro 401.
 *
 * <h2>A sessão tem uma oficina, e ela pode trocar</h2>
 *
 * Uma pessoa pode ter vínculo com mais de uma oficina — o dono com duas unidades,
 * o mecânico que trabalha meio período em duas. O token carrega **em qual delas
 * a sessão está**, e trocar de oficina significa pedir um token novo ao servidor,
 * não mexer no que está guardado aqui. Reescrever a oficina no cliente não mudaria
 * nada: quem decide o escopo de cada requisição é o vínculo que o backend confere
 * contra o banco.
 *
 * <h2>Estar autenticado não é o mesmo que estar numa oficina</h2>
 *
 * `isAuthenticated()` e `hasWorkshop()` são coisas diferentes. Quem saiu de uma
 * oficina e ainda não criou a própria está autenticado e sem oficina — um estado
 * legítimo, com tela própria, e não um erro.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly authApi = inject(AuthApi);
  private readonly profileApi = inject(ProfileApi);
  private readonly router = inject(Router);

  private readonly session = signal<StoredSession | null>(readStoredSession());

  /** Usuário autenticado, ou nulo. */
  readonly user = computed(() => this.session()?.user ?? null);

  readonly isAuthenticated = computed(() => this.session() !== null);

  readonly role = computed<Role | null>(() => this.session()?.user.role ?? null);

  readonly workshopName = computed(() => this.session()?.user.workshopName ?? null);

  readonly workshopId = computed(() => this.session()?.user.workshopId ?? null);

  /** Oficinas em que esta pessoa pode entrar. */
  readonly workshops = computed<WorkshopOption[]>(() => this.session()?.workshops ?? []);

  /** Se a sessão está dentro de alguma oficina. */
  readonly hasWorkshop = computed(() => !!this.session()?.user.workshopId);

  /**
   * Se a pessoa precisa escolher em qual oficina entrar.
   *
   * Autenticada, com mais de um vínculo e ainda sem oficina definida — é o
   * estado logo depois de um login com dois ou mais vínculos.
   */
  readonly needsWorkshopChoice = computed(
    () => this.isAuthenticated() && !this.hasWorkshop() && this.workshops().length > 0,
  );

  /**
   * Se a pessoa não tem vínculo com oficina nenhuma.
   *
   * O caso de quem foi desligado: entra normalmente e o caminho oferecido é
   * criar a própria oficina.
   */
  readonly hasNoWorkshop = computed(
    () => this.isAuthenticated() && !this.hasWorkshop() && this.workshops().length === 0,
  );

  /** Só faz sentido oferecer troca quando há mais de uma. */
  readonly canSwitchWorkshop = computed(() => this.workshops().length > 1);

  /** Token puro, para o interceptor. */
  get token(): string | null {
    return this.session()?.token ?? null;
  }

  hasAnyRole(...roles: Role[]): boolean {
    const current = this.role();
    return current !== null && roles.includes(current);
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.authApi.login(credentials).pipe(tap((response) => this.store(response)));
  }

  /**
   * Entra numa das oficinas da pessoa.
   *
   * O token novo vem do servidor já escopado. Guardar a escolha só no cliente
   * não teria efeito: o escopo de cada requisição sai do vínculo que o backend
   * confere, e não de nada que o navegador diga.
   */
  selectWorkshop(workshopId: string): Observable<LoginResponse> {
    return this.authApi.selectWorkshop(workshopId).pipe(tap((response) => this.store(response)));
  }

  /** Recarrega os dados do usuário, por exemplo depois de editar o perfil. */
  refreshUser(): Observable<UserResponse> {
    return this.profileApi.me().pipe(
      tap((user) => {
        const current = this.session();
        if (current) {
          this.persist({ ...current, user });
        }
      }),
    );
  }

  /** Atualiza a lista de oficinas — depois de criar uma, por exemplo. */
  refreshWorkshops(): Observable<WorkshopOption[]> {
    return this.authApi.myWorkshops().pipe(
      tap((workshops) => {
        const current = this.session();
        if (current) {
          this.persist({ ...current, workshops });
        }
      }),
    );
  }

  /** Encerra a sessão e volta para o login. */
  logout(redirect = true): void {
    localStorage.removeItem(STORAGE_KEY);
    this.session.set(null);
    if (redirect) {
      void this.router.navigate(['/entrar']);
    }
  }

  private store(response: LoginResponse): void {
    this.persist({
      token: response.accessToken,
      user: response.user,
      expiresAt: Date.now() + response.expiresIn * 1000,
      workshops: response.workshops ?? [],
    });
  }

  private persist(value: StoredSession): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    this.session.set(value);
  }
}

/** Lê a sessão salva, descartando o que estiver corrompido ou vencido. */
function readStoredSession(): StoredSession | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as StoredSession;
    if (!parsed?.token || !parsed?.user || parsed.expiresAt <= Date.now()) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    // Sessão gravada antes desta versão não tem a lista; um array vazio a
    // mantém utilizável em vez de quebrar na primeira leitura.
    return { ...parsed, workshops: parsed.workshops ?? [] };
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}
