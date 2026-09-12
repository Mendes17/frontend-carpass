import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { ThemeService } from './core/services/theme.service';

/** Raiz da aplicação. */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
export class App {
  // Injetado na raiz para o tema salvo ser aplicado antes da primeira tela.
  private readonly theme = inject(ThemeService);
}
