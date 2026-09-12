import { Component, effect, input, output, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/**
 * Campo de busca com atraso.
 *
 * Sem o atraso, cada tecla vira uma requisição. Com 350ms, quem digita "Silva"
 * dispara uma busca em vez de cinco, e a lista para de piscar a cada letra.
 */
@Component({
  selector: 'cp-search-input',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="search">
      <mat-icon class="search-icon" aria-hidden="true">search</mat-icon>
      <input
        type="search"
        class="cp-input"
        [placeholder]="placeholder()"
        [value]="text()"
        (input)="onInput($event)"
        [attr.aria-label]="placeholder()"
      />
      @if (text()) {
        <button type="button" class="clear" (click)="clear()" aria-label="Limpar busca">
          <mat-icon aria-hidden="true">close</mat-icon>
        </button>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        flex: 1;
        min-width: 200px;
      }
      .search {
        position: relative;
        display: flex;
        align-items: center;
      }
      .search .cp-input {
        padding-left: 44px;
        padding-right: 44px;
      }
      .search-icon {
        position: absolute;
        left: 14px;
        color: var(--cp-text-muted);
        font-size: 20px;
        width: 20px;
        height: 20px;
        pointer-events: none;
      }
      .clear {
        position: absolute;
        right: 6px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border: none;
        border-radius: 50%;
        background: transparent;
        color: var(--cp-text-muted);
        cursor: pointer;
      }
      .clear:hover {
        background: var(--cp-bg-hover);
        color: var(--cp-text);
      }
      .clear mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
      /* O X nativo do type=search duplicaria o nosso botão. */
      input[type='search']::-webkit-search-cancel-button {
        display: none;
      }
    `,
  ],
})
export class SearchInputComponent {
  readonly placeholder = input('Buscar');
  readonly delay = input(350);
  readonly search = output<string>();

  protected readonly text = signal('');
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Cancela o disparo pendente quando o componente sai de cena.
    effect((onCleanup) => onCleanup(() => this.cancel()));
  }

  protected onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.text.set(value);
    this.cancel();
    this.timer = setTimeout(() => this.search.emit(value.trim()), this.delay());
  }

  protected clear(): void {
    this.cancel();
    this.text.set('');
    this.search.emit('');
  }

  private cancel(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
