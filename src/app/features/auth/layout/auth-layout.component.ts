import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterOutlet } from '@angular/router';

import { ThemeService } from '../../../core/services/theme.service';

/** Moldura das telas públicas: marca de um lado, formulário do outro. */
@Component({
  selector: 'cp-auth-layout',
  standalone: true,
  imports: [RouterOutlet, MatIconModule],
  templateUrl: './auth-layout.component.html',
  styleUrl: './auth-layout.component.css',
})
export class AuthLayoutComponent {
  protected readonly theme = inject(ThemeService);
}
