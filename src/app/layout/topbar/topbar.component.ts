import { Component, inject, output, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { apiErrorMessage } from '../../core/http/api-error.util';
import { WorkshopOption } from '../../core/models/auth.model';
import { SnackbarService } from '../../core/services/snackbar.service';
import { ThemeService } from '../../core/services/theme.service';

/**
 * Barra superior: abrir menu no mobile, trocar de oficina, alternar tema e
 * conta do usuário.
 *
 * <h2>O seletor de oficina</h2>
 *
 * Só aparece para quem tem vínculo com mais de uma. Para a maioria — uma pessoa,
 * uma oficina — ele seria um controle inerte ocupando espaço e sugerindo que há
 * algo a escolher.
 *
 * Trocar de oficina **recarrega a aplicação inteira** de propósito. Metade das
 * telas guarda estado da oficina anterior em signals: listas paginadas, filtros,
 * contadores do painel, e o canal de tempo real assinado no tópico da oficina
 * antiga. Costurar tudo isso para reagir a uma troca daria muitos lugares onde
 * esquecer um, e o sintoma do esquecimento seria o pior possível — dado de uma
 * oficina aparecendo na tela da outra. Recarregar é grosseiro e é honesto.
 */
@Component({
  selector: 'cp-topbar',
  standalone: true,
  imports: [MatIconModule, MatMenuModule, RouterLink],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.css',
})
export class TopbarComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly snackbar = inject(SnackbarService);
  protected readonly theme = inject(ThemeService);

  readonly toggleSidebar = output<void>();

  protected readonly user = this.auth.user;
  protected readonly workshops = this.auth.workshops;
  protected readonly canSwitch = this.auth.canSwitchWorkshop;
  protected readonly workshopName = this.auth.workshopName;
  protected readonly workshopId = this.auth.workshopId;

  protected readonly trocando = signal(false);

  protected trocarOficina(opcao: WorkshopOption): void {
    if (opcao.workshopId === this.workshopId() || this.trocando()) {
      return;
    }

    this.trocando.set(true);

    this.auth.selectWorkshop(opcao.workshopId).subscribe({
      next: () => {
        // Recarga completa: ver o comentário da classe. O destino é o painel
        // porque a tela atual pode nem existir na oficina nova — uma ordem de
        // serviço aberta lá não é a mesma ordem aqui.
        window.location.assign('/painel');
      },
      error: (erro: unknown) => {
        this.trocando.set(false);
        this.snackbar.error(apiErrorMessage(erro));
      },
    });
  }

  protected logout(): void {
    this.auth.logout(false);
    void this.router.navigate(['/entrar']);
  }

  /** Iniciais para o avatar, sem depender de foto. */
  protected initials(): string {
    const current = this.user();
    if (!current) {
      return '?';
    }
    const parts = current.fullName.trim().split(/\s+/);
    const first = parts[0]?.charAt(0) ?? '';
    const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
    return (first + last).toUpperCase();
  }
}
