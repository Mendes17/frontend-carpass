import { Injectable, computed, effect, inject, signal } from '@angular/core';

import { WorkshopApi } from '../api/workshop.api';
import { AuthService } from './auth.service';

/**
 * Se a pessoa desta sessão enxerga o financeiro.
 *
 * <h2>A regra tem duas partes</h2>
 *
 * O proprietário sempre vê. O gerente vê quando o dono autorizou — e essa
 * autorização é uma coluna da oficina, então ela precisa ser buscada. Atendente
 * e mecânico não veem em hipótese nenhuma, e para eles nem existe busca.
 *
 * <h2>Isto é conveniência, não segurança</h2>
 *
 * Serve para o menu não oferecer um caminho que a pessoa não pode seguir. Quem
 * barra de verdade é o backend: a mesma requisição feita fora da tela recebe
 * 403, mesmo que alguém force o valor aqui pelo console.
 *
 * <h2>Por que começa em "não sei"</h2>
 *
 * Para o gerente, a resposta só existe depois que a oficina carrega. Começar em
 * `true` faria o item do menu aparecer e sumir; começar em `false` sem
 * distinguir o "ainda não sei" esconderia para sempre se a busca falhasse. O
 * estado indefinido deixa os dois casos explícitos.
 */
@Injectable({ providedIn: 'root' })
export class FinanceAccessService {
  private readonly auth = inject(AuthService);
  private readonly workshopApi = inject(WorkshopApi);

  /** null enquanto a oficina não respondeu. */
  private readonly managerAllowed = signal<boolean | null>(null);

  /** true, false, ou null enquanto ainda não dá para afirmar. */
  readonly canSeeFinance = computed<boolean | null>(() => {
    const user = this.auth.user();
    if (!user) {
      return false;
    }
    if (user.role === 'OWNER') {
      return true;
    }
    if (user.role !== 'MANAGER') {
      return false;
    }
    return this.managerAllowed();
  });

  constructor() {
    // Só o gerente precisa perguntar: para os outros papéis a resposta já saiu
    // do próprio papel, e uma requisição a mais no arranque seria desperdício.
    effect(() => {
      const user = this.auth.user();
      if (user?.role !== 'MANAGER') {
        this.managerAllowed.set(null);
        return;
      }

      this.workshopApi.get().subscribe({
        next: (oficina) => this.managerAllowed.set(oficina.managerCanSeeFinance),
        // Falhou: assume que não vê. O menu esconde, e se for engano a pessoa
        // ainda alcança a tela pela URL e recebe do backend a resposta certa.
        error: () => this.managerAllowed.set(false),
      });
    });
  }

  /** Reaplica a resposta depois de o dono mexer na chave, sem recarregar a página. */
  setManagerAllowed(permitido: boolean): void {
    if (this.auth.user()?.role === 'MANAGER') {
      this.managerAllowed.set(permitido);
    }
  }
}
