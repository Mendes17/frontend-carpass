/**
 * LoadingComponent - Spinner de carregamento reutilizável
 * Usado para indicar operações assíncronas em andamento
 */
import { Component, input } from '@angular/core';

@Component({
  selector: 'cp-loading',
  standalone: true,
  template: `
    <div class="loading-container" [class.overlay]="overlay()" role="status" aria-label="Carregando">
      <div class="spinner"></div>
      @if (message()) {
        <span class="loading-text">{{ message() }}</span>
      }
    </div>
  `,
  styles: [`
    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
      padding: 32px;
    }
    .loading-container.overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(4px);
      z-index: 9999;
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid var(--cp-border);
      border-top-color: var(--cp-primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    .loading-text {
      color: var(--cp-text-secondary);
      font-size: 14px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class LoadingComponent {
  /** Se true, exibe como overlay sobre toda a tela */
  overlay = input(false);
  /** Mensagem opcional abaixo do spinner */
  message = input<string>('');
}
