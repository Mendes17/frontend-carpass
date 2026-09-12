import { Component, HostListener, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterOutlet } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { RealtimeService } from '../../core/realtime/realtime.service';
import { SnackbarService } from '../../core/services/snackbar.service';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopbarComponent } from '../topbar/topbar.component';

/** Moldura das telas autenticadas: navegação lateral, barra superior e conteúdo. */
@Component({
  selector: 'cp-shell',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, TopbarComponent],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.css',
})
export class ShellComponent {
  private readonly realtime = inject(RealtimeService);
  private readonly snackbar = inject(SnackbarService);
  private readonly auth = inject(AuthService);

  protected readonly sidebarOpen = signal(false);

  constructor() {
    /*
     * O aviso de estoque baixo mora no shell, e não numa tela.
     *
     * Ele precisa alcançar quem estiver em qualquer lugar do sistema: a peça
     * acaba enquanto alguém monta uma ordem de serviço, não enquanto olha a
     * tela de peças. Aqui é o único ponto por onde toda tela autenticada passa.
     *
     * Só a gerência é notificada: quem repõe estoque é quem compra, e alertar
     * o mecânico sobre algo que ele não pode resolver vira ruído.
     */
    this.realtime.events.pipe(takeUntilDestroyed()).subscribe((evento) => {
      if (evento.type !== 'LOW_STOCK' || !this.auth.hasAnyRole('OWNER', 'MANAGER')) {
        return;
      }

      this.snackbar.warning(
        `Estoque baixo: ${evento.partName} está com ${evento.stockQuantity} (mínimo ${evento.minimumStock}).`,
      );
    });
  }

  protected toggleSidebar(): void {
    this.sidebarOpen.update((open) => !open);
  }

  protected closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  /** Esc fecha a gaveta: quem navega por teclado precisa de uma saída. */
  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.closeSidebar();
  }
}
