import { Component, input } from '@angular/core';

/** Título, subtítulo e ações de uma tela. */
@Component({
  selector: 'cp-page-header',
  standalone: true,
  template: `
    <header class="cp-page-header">
      <div>
        <h1 class="cp-page-title">{{ title() }}</h1>
        @if (subtitle()) {
          <p class="cp-page-subtitle">{{ subtitle() }}</p>
        }
      </div>
      <div class="cp-page-actions">
        <ng-content />
      </div>
    </header>
  `,
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly subtitle = input('');
}
