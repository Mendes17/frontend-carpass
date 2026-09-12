/**
 * EmptyStateComponent - Estado vazio quando não há dados
 * Mostra ícone, título e ação quando listas/tabelas estão vazias
 */
import { Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'cp-empty-state',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="empty-state animate-fade-in">
      <mat-icon class="empty-icon">{{ icon() }}</mat-icon>
      <h3>{{ title() }}</h3>
      <p>{{ description() }}</p>
      @if (actionText()) {
        <button class="cp-btn cp-btn-primary" (click)="action.emit()">
          {{ actionText() }}
        </button>
      }
    </div>
  `,
  styles: [`
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 64px 24px;
      text-align: center;
      gap: 8px;
    }
    .empty-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: var(--cp-text-muted);
      margin-bottom: 8px;
    }
    h3 {
      font-size: 18px;
      font-weight: 600;
      color: var(--cp-text);
    }
    p {
      font-size: 14px;
      color: var(--cp-text-secondary);
      max-width: 320px;
      margin-bottom: 16px;
    }
  `]
})
export class EmptyStateComponent {
  icon = input('inbox');
  title = input('Nenhum item encontrado');
  description = input('');
  actionText = input('');
  action = output<void>();
}
