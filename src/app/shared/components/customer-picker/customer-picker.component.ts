import { Component, forwardRef, inject, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';

import { CustomerApi } from '../../../core/api/customer.api';
import { CustomerResponse } from '../../../core/models/customer.model';

/**
 * Seletor de cliente com busca no servidor.
 *
 * Uma oficina com centenas de clientes não cabe em um `select`: a pessoa teria
 * que rolar a lista inteira procurando um nome. Aqui ela digita parte do nome ou
 * do documento e a busca acontece no banco, com o mesmo filtro da listagem.
 *
 * Implementa `ControlValueAccessor` para se comportar como qualquer outro campo
 * dentro de um formulário reativo — o valor trafegado é o id do cliente.
 */
@Component({
  selector: 'cp-customer-picker',
  standalone: true,
  imports: [MatAutocompleteModule, MatIconModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CustomerPickerComponent),
      multi: true,
    },
  ],
  template: `
    <div class="picker">
      <mat-icon class="picker-icon" aria-hidden="true">search</mat-icon>
      <input
        type="text"
        class="cp-input"
        [value]="text()"
        [disabled]="disabled()"
        (input)="onInput($event)"
        (blur)="onTouched()"
        [matAutocomplete]="auto"
        placeholder="Digite o nome ou documento do cliente"
        aria-label="Cliente"
      />
      @if (text() && !disabled()) {
        <button type="button" class="picker-clear" (click)="clear()" aria-label="Limpar cliente">
          <mat-icon aria-hidden="true">close</mat-icon>
        </button>
      }
    </div>

    <mat-autocomplete #auto="matAutocomplete" (optionSelected)="select($event.option.value)">
      @for (customer of options(); track customer.id) {
        <mat-option [value]="customer">
          <span class="option-name">{{ customer.name }}</span>
          @if (customer.document) {
            <span class="option-doc">{{ customer.document }}</span>
          }
        </mat-option>
      }
      @if (searched() && !options().length) {
        <mat-option [disabled]="true">Nenhum cliente encontrado</mat-option>
      }
    </mat-autocomplete>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .picker {
        position: relative;
        display: flex;
        align-items: center;
      }
      .picker .cp-input {
        padding-left: 44px;
        padding-right: 44px;
      }
      .picker-icon {
        position: absolute;
        left: 14px;
        color: var(--cp-text-muted);
        font-size: 20px;
        width: 20px;
        height: 20px;
        pointer-events: none;
      }
      .picker-clear {
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
      .picker-clear:hover {
        background: var(--cp-bg-hover);
        color: var(--cp-text);
      }
      .picker-clear mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
      .option-doc {
        margin-left: 8px;
        font-size: 12px;
        color: var(--cp-text-secondary);
      }
    `,
  ],
})
export class CustomerPickerComponent implements ControlValueAccessor {
  private readonly api = inject(CustomerApi);

  protected readonly text = signal('');
  protected readonly options = signal<CustomerResponse[]>([]);
  protected readonly searched = signal(false);
  protected readonly disabled = signal(false);

  private timer: ReturnType<typeof setTimeout> | null = null;
  private onChange: (value: string | null) => void = () => undefined;
  protected onTouched: () => void = () => undefined;

  // ------------------------------------------------ ControlValueAccessor
  writeValue(value: string | null): void {
    if (!value) {
      this.text.set('');
      return;
    }
    // Ao editar, o formulário entrega só o id: buscamos o nome para exibir.
    this.api.getById(value).subscribe({
      next: (customer) => this.text.set(customer.name),
      error: () => this.text.set(''),
    });
  }

  registerOnChange(fn: (value: string | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  // ----------------------------------------------------------- interação
  protected onInput(event: Event): void {
    const term = (event.target as HTMLInputElement).value;
    this.text.set(term);
    // Digitar invalida a escolha anterior: o formulário fica sem cliente até
    // que uma opção da lista seja escolhida de fato.
    this.onChange(null);

    if (this.timer) {
      clearTimeout(this.timer);
    }
    if (term.trim().length < 2) {
      this.options.set([]);
      this.searched.set(false);
      return;
    }
    this.timer = setTimeout(() => this.search(term.trim()), 300);
  }

  private search(term: string): void {
    this.api.list({ q: term, active: true, size: 10, sort: 'name,asc' }).subscribe({
      next: (page) => {
        this.options.set(page.content);
        this.searched.set(true);
      },
      error: () => {
        this.options.set([]);
        this.searched.set(true);
      },
    });
  }

  protected select(customer: CustomerResponse): void {
    this.text.set(customer.name);
    this.options.set([]);
    this.onChange(customer.id);
    this.onTouched();
  }

  protected clear(): void {
    this.text.set('');
    this.options.set([]);
    this.searched.set(false);
    this.onChange(null);
  }
}
