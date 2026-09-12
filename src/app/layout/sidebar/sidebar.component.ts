import { Component, computed, inject, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { FinanceAccessService } from '../../core/auth/finance-access.service';
import { NAV_ITEMS, NavItem } from '../nav-items';

/**
 * Navegação principal.
 *
 * Em telas largas fica fixa à esquerda; abaixo de 1024px vira uma gaveta que
 * desliza sobre o conteúdo, e fechar ao navegar é obrigatório — senão o toque
 * seguinte cai no overlay.
 */
@Component({
  selector: 'cp-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MatIconModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
})
export class SidebarComponent {
  private readonly auth = inject(AuthService);
  private readonly financeAccess = inject(FinanceAccessService);

  readonly open = input(false);
  readonly close = output<void>();

  protected readonly workshopName = this.auth.workshopName;

  /**
   * Só os itens que a pessoa desta sessão pode acessar.
   *
   * Os itens financeiros têm uma condição a mais: o dono decide se o gerente
   * enxerga. Enquanto a resposta não chega (`null`), eles ficam de fora — é
   * preferível o item aparecer um instante depois a aparecer e sumir.
   */
  protected readonly items = computed<NavItem[]>(() =>
    NAV_ITEMS.filter((item) => {
      if (item.roles && !this.auth.hasAnyRole(...item.roles)) {
        return false;
      }
      return !item.finance || this.financeAccess.canSeeFinance() === true;
    }),
  );
}
