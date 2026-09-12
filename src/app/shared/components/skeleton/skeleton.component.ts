/**
 * SkeletonComponent - Placeholder de carregamento para conteúdo
 * Melhora a percepção de velocidade mostrando estrutura antes dos dados
 */
import { Component, input } from '@angular/core';

@Component({
  selector: 'cp-skeleton',
  standalone: true,
  template: `
    <div
      class="skeleton"
      [style.width]="width()"
      [style.height]="height()"
      [style.border-radius]="circle() ? '50%' : 'var(--cp-radius-sm)'"
      role="presentation"
      aria-hidden="true"
    ></div>
  `,
  styles: [`
    .skeleton {
      background: var(--cp-bg-skeleton);
      animation: skeleton-pulse 1.5s ease-in-out infinite;
    }
    @keyframes skeleton-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
  `]
})
export class SkeletonComponent {
  width = input('100%');
  height = input('16px');
  circle = input(false);
}
