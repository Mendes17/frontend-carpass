import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

import { DashboardApi } from '../../core/api/dashboard.api';
import { AuthService } from '../../core/auth/auth.service';
import { RealtimeService } from '../../core/realtime/realtime.service';
import { DashboardResponse } from '../../core/models/dashboard.model';
import { WORK_ORDER_STATUS_TONES, isFinalStatus } from '../../core/models/enums.model';
import { BarListComponent, BarListItem } from '../../shared/components/bar-list/bar-list.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import { StatTileComponent } from '../../shared/components/stat-tile/stat-tile.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';

/**
 * Visão geral da oficina.
 *
 * Traz tudo em uma chamada só. As decisões de forma seguem o que cada dado pede:
 * número solto vira cartão, não gráfico; a distribuição das ordens vira barra
 * horizontal em uma cor só, com o que já saiu da oficina em cinza; e o que é
 * lista continua lista.
 */
@Component({
  selector: 'cp-dashboard-page',
  standalone: true,
  imports: [
    RouterLink,
    CurrencyPipe,
    DatePipe,
    MatIconModule,
    PageHeaderComponent,
    StatTileComponent,
    StatusBadgeComponent,
    BarListComponent,
    EmptyStateComponent,
    SkeletonComponent,
  ],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.css',
})
export class DashboardPage {
  private readonly api = inject(DashboardApi);
  private readonly auth = inject(AuthService);
  private readonly realtime = inject(RealtimeService);

  protected readonly data = signal<DashboardResponse | null>(null);
  protected readonly loading = signal(true);
  protected readonly failed = signal(false);

  protected readonly firstName = computed(() => this.auth.user()?.firstName ?? '');

  /**
   * Ordens por etapa, na sequência do fluxo, contando só o que ainda está na
   * oficina.
   *
   * Entregues e canceladas ficam de fora do gráfico de propósito: são totais
   * acumulados desde sempre, enquanto as demais etapas são uma fotografia de
   * agora. Misturar as duas coisas em uma escala só faz a barra de "entregue"
   * engolir todo o resto — com 87 entregas, uma etapa com 4 ordens vira um traço
   * invisível, e a comparação que interessa se perde. Os totais fechados
   * aparecem como texto logo abaixo.
   */
  protected readonly statusBars = computed<BarListItem[]>(
    () =>
      this.data()
        ?.ordersByStatus.filter((entry) => !isFinalStatus(entry.status))
        .map((entry) => ({ label: entry.label, value: entry.count })) ?? [],
  );

  /** Totais acumulados de ordens já encerradas, exibidos como texto. */
  protected readonly closedSummary = computed(() => {
    const entries = this.data()?.ordersByStatus ?? [];
    const find = (status: string) => entries.find((entry) => entry.status === status)?.count ?? 0;
    return { delivered: find('DELIVERED'), canceled: find('CANCELED') };
  });

  protected readonly topServiceBars = computed<BarListItem[]>(
    () =>
      this.data()?.topServices.map((service) => ({
        label: service.description,
        value: service.count,
      })) ?? [],
  );

  protected readonly hasAnyOrder = computed(() =>
    this.statusBars().some((bar) => bar.value > 0),
  );

  constructor() {
    this.load();

    // O painel fica aberto no balcão o dia inteiro. Recarregar ao receber um
    // aviso mantém os números condizentes com o que está acontecendo na
    // oficina, sem ninguém precisar apertar F5.
    this.realtime.events.pipe(takeUntilDestroyed()).subscribe((evento) => {
      if (evento.type === 'WORK_ORDER_CHANGED' || evento.type === 'QUOTE_DECIDED') {
        this.load({ silencioso: true });
      }
    });
  }

  protected load(opcoes: { silencioso?: boolean } = {}): void {
    // Atualização vinda de aviso não mostra esqueleto: a tela pisca inteira
    // e a pessoa perde o que estava lendo.
    if (!opcoes.silencioso) {
      this.loading.set(true);
    }
    this.failed.set(false);

    this.api.load().subscribe({
      next: (response) => {
        this.data.set(response);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.failed.set(true);
      },
    });
  }

  protected toneOf(status: DashboardResponse['recentOrders'][number]['status']) {
    return WORK_ORDER_STATUS_TONES[status];
  }
}
