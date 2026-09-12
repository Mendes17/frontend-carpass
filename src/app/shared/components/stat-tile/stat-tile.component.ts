import { NgTemplateOutlet } from '@angular/common';
import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

/**
 * Número de destaque do painel.
 *
 * Um valor único não vira gráfico: vira um número grande com rótulo. Quando há
 * uma tela por trás, o cartão inteiro é o link, para o alvo de toque cobrir o
 * cartão e não só o texto.
 */
@Component({
  selector: 'cp-stat-tile',
  standalone: true,
  imports: [MatIconModule, RouterLink, NgTemplateOutlet],
  template: `
    @if (link()) {
      <a class="tile" [routerLink]="link()">
        <ng-container [ngTemplateOutlet]="body" />
      </a>
    } @else {
      <div class="tile">
        <ng-container [ngTemplateOutlet]="body" />
      </div>
    }

    <ng-template #body>
      <div class="tile-head">
        <span class="tile-label">{{ label() }}</span>
        <mat-icon class="tile-icon" [class.alert]="alert()" aria-hidden="true">{{ icon() }}</mat-icon>
      </div>
      <strong class="tile-value" [class.alert]="alert()">{{ value() }}</strong>
      @if (hint()) {
        <span class="tile-hint">{{ hint() }}</span>
      }
    </ng-template>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .tile {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding: 20px;
        background: var(--cp-bg-card);
        border: 1px solid var(--cp-border);
        border-radius: var(--cp-radius);
        box-shadow: var(--cp-shadow);
        color: inherit;
        text-decoration: none;
        height: 100%;
        transition: box-shadow var(--cp-transition), transform var(--cp-transition);
      }
      a.tile:hover {
        box-shadow: var(--cp-shadow-md);
        transform: translateY(-2px);
      }
      a.tile:focus-visible {
        outline: 2px solid var(--cp-border-focus);
        outline-offset: 2px;
      }
      .tile-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
      .tile-label {
        font-size: 13px;
        color: var(--cp-text-secondary);
      }
      .tile-icon {
        color: var(--cp-primary);
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
      .tile-icon.alert,
      .tile-value.alert {
        color: var(--cp-danger-fg);
      }
      .tile-value {
        font-size: 30px;
        font-weight: 600;
        line-height: 1.1;
        color: var(--cp-text);
        font-variant-numeric: tabular-nums;
      }
      .tile-hint {
        font-size: 12px;
        color: var(--cp-text-muted);
      }
    `,
  ],
})
export class StatTileComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly icon = input('insights');
  readonly hint = input<string>('');
  readonly link = input<string | null>(null);
  /** Destaca em vermelho quando o número pede ação, como estoque abaixo do mínimo. */
  readonly alert = input(false);
}
