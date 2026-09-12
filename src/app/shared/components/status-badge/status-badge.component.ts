import { Component, computed, input } from '@angular/core';

import { StatusTone } from '../../../core/models/enums.model';

/**
 * Selo de estado.
 *
 * O rótulo textual está sempre presente: a cor é reforço de leitura, nunca a
 * única forma de saber em que estado a coisa está. Isso vale para daltonismo,
 * impressão e modo de alto contraste.
 */
@Component({
  selector: 'cp-status-badge',
  standalone: true,
  template: `
    <span class="cp-badge" [class]="toneClass()">
      <span class="cp-badge-dot" aria-hidden="true"></span>
      {{ label() }}
    </span>
  `,
})
export class StatusBadgeComponent {
  readonly label = input.required<string>();
  readonly tone = input<StatusTone>('neutral');

  protected readonly toneClass = computed(() => `cp-badge-${this.tone()}`);
}
