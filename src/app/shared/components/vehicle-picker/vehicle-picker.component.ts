import { Component, forwardRef, inject, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';

import { VehicleApi } from '../../../core/api/vehicle.api';
import { VehicleResponse } from '../../../core/models/vehicle.model';

/**
 * Seletor de veículo com busca no servidor.
 *
 * Aceita um `customerId`: quando ele existe, a busca só devolve os carros
 * daquele cliente. É o caso de abrir uma ordem de serviço — a pessoa já disse
 * de quem é, e oferecer a frota inteira da oficina só cria chance de errar o
 * carro.
 *
 * O valor trafegado no formulário é o id do veículo.
 */
@Component({
  selector: 'cp-vehicle-picker',
  standalone: true,
  imports: [MatAutocompleteModule, MatIconModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => VehiclePickerComponent),
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
        [placeholder]="placeholder()"
        aria-label="Veículo"
      />
      @if (text() && !disabled()) {
        <button type="button" class="picker-clear" (click)="clear()" aria-label="Limpar veículo">
          <mat-icon aria-hidden="true">close</mat-icon>
        </button>
      }
    </div>

    <mat-autocomplete #auto="matAutocomplete" (optionSelected)="select($event.option.value)">
      @for (vehicle of options(); track vehicle.id) {
        <mat-option [value]="vehicle">
          <span class="option-plate">{{ vehicle.plate }}</span>
          <span class="option-desc">{{ vehicle.brand }} {{ vehicle.model }}</span>
        </mat-option>
      }
      @if (searched() && !options().length) {
        <mat-option [disabled]="true">{{ emptyMessage() }}</mat-option>
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
      .option-plate {
        font-weight: 600;
        font-variant-numeric: tabular-nums;
      }
      .option-desc {
        margin-left: 8px;
        font-size: 12px;
        color: var(--cp-text-secondary);
      }
    `,
  ],
})
export class VehiclePickerComponent implements ControlValueAccessor {
  /** Quando presente, restringe a busca à frota deste cliente. */
  readonly customerId = input<string | null>(null);

  private readonly api = inject(VehicleApi);

  protected readonly text = signal('');
  protected readonly options = signal<VehicleResponse[]>([]);
  protected readonly searched = signal(false);
  protected readonly disabled = signal(false);

  private timer: ReturnType<typeof setTimeout> | null = null;
  private onChange: (value: string | null) => void = () => undefined;
  protected onTouched: () => void = () => undefined;

  protected placeholder(): string {
    return this.customerId()
      ? 'Digite a placa ou o modelo do carro deste cliente'
      : 'Digite a placa ou o modelo';
  }

  protected emptyMessage(): string {
    return this.customerId()
      ? 'Este cliente não tem veículo com esse termo'
      : 'Nenhum veículo encontrado';
  }

  // ------------------------------------------------ ControlValueAccessor
  writeValue(value: string | null): void {
    if (!value) {
      this.text.set('');
      return;
    }
    this.api.getById(value).subscribe({
      next: (vehicle) => this.text.set(`${vehicle.plate} — ${vehicle.brand} ${vehicle.model}`),
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
    // Digitar invalida a escolha anterior: sem isso o formulário guardaria o id
    // de um carro enquanto o campo mostra o texto de outro.
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
    this.api
      .list({
        q: term,
        customerId: this.customerId(),
        active: true,
        size: 10,
        sort: 'plate,asc',
      })
      .subscribe({
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

  protected select(vehicle: VehicleResponse): void {
    this.text.set(`${vehicle.plate} — ${vehicle.brand} ${vehicle.model}`);
    this.options.set([]);
    this.onChange(vehicle.id);
    this.onTouched();
  }

  protected clear(): void {
    this.text.set('');
    this.options.set([]);
    this.searched.set(false);
    this.onChange(null);
  }
}
