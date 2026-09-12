import { Component, computed, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/** Navegação entre páginas de uma listagem. */
@Component({
  selector: 'cp-paginator',
  standalone: true,
  imports: [MatIconModule],
  template: `
    @if (totalElements() > 0) {
      <nav class="paginator" aria-label="Paginação">
        <span class="range" aria-live="polite">
          {{ firstItem() }}–{{ lastItem() }} de {{ totalElements() }}
        </span>
        <div class="controls">
          <button
            type="button"
            class="cp-btn cp-btn-ghost"
            [disabled]="first()"
            (click)="pageChange.emit(page() - 1)"
            aria-label="Página anterior"
          >
            <mat-icon aria-hidden="true">chevron_left</mat-icon>
          </button>
          <span class="page-label">{{ page() + 1 }} / {{ totalPages() || 1 }}</span>
          <button
            type="button"
            class="cp-btn cp-btn-ghost"
            [disabled]="last()"
            (click)="pageChange.emit(page() + 1)"
            aria-label="Próxima página"
          >
            <mat-icon aria-hidden="true">chevron_right</mat-icon>
          </button>
        </div>
      </nav>
    }
  `,
  styles: [
    `
      .paginator {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 12px 16px;
        border-top: 1px solid var(--cp-border);
      }
      .range,
      .page-label {
        font-size: 13px;
        color: var(--cp-text-secondary);
        font-variant-numeric: tabular-nums;
      }
      .controls {
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .controls .cp-btn {
        padding: 8px;
        min-width: 40px;
      }
    `,
  ],
})
export class PaginatorComponent {
  readonly page = input(0);
  readonly totalPages = input(0);
  readonly totalElements = input(0);
  readonly size = input(20);
  readonly first = input(true);
  readonly last = input(true);

  readonly pageChange = output<number>();

  protected readonly firstItem = computed(() => this.page() * this.size() + 1);
  protected readonly lastItem = computed(() =>
    Math.min((this.page() + 1) * this.size(), this.totalElements()),
  );
}
