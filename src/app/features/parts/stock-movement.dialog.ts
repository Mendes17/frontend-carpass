import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { StockMovementRequest } from '../../core/models/part.model';
import { STOCK_MOVEMENT_LABELS, StockMovementType } from '../../core/models/enums.model';

export interface StockMovementDialogData {
  partName: string;
  currentStock: number;
}

/**
 * Registra entrada, saída ou ajuste de estoque.
 *
 * O ajuste é diferente dos outros dois: a quantidade digitada é o novo saldo
 * absoluto, não um valor a somar ou subtrair. Como confundir os dois estraga o
 * estoque de forma silenciosa, a tela mostra o saldo resultante antes de
 * confirmar.
 */
@Component({
  selector: 'cp-stock-movement-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>Movimentar estoque</h2>

    <mat-dialog-content>
      <p class="part-line">
        <strong>{{ data.partName }}</strong>
        <span class="current">Saldo atual: {{ data.currentStock }}</span>
      </p>

      <form [formGroup]="form" novalidate>
        <div class="cp-field">
          <label class="cp-label" for="movement-type">Tipo</label>
          <select id="movement-type" class="cp-select" formControlName="type">
            @for (option of types; track option.value) {
              <option [value]="option.value">{{ option.label }}</option>
            }
          </select>
        </div>

        <div class="cp-field">
          <label class="cp-label" for="movement-quantity">{{ quantityLabel() }}</label>
          <input id="movement-quantity" type="number" min="0" step="1" class="cp-input"
                 formControlName="quantity"
                 [class.error]="form.controls.quantity.touched && form.controls.quantity.invalid" />
          @if (form.controls.quantity.touched && form.controls.quantity.invalid) {
            <span class="cp-error-msg">Informe uma quantidade a partir de zero.</span>
          }
        </div>

        <div class="cp-field">
          <label class="cp-label" for="movement-reason">Motivo</label>
          <input id="movement-reason" type="text" class="cp-input" formControlName="reason"
                 placeholder="Compra do fornecedor, perda, contagem física..." />
        </div>

        <p class="resulting" [class.negative]="resultingStock() < 0" role="status">
          <mat-icon aria-hidden="true">{{ resultingStock() < 0 ? 'error_outline' : 'inventory_2' }}</mat-icon>
          @if (resultingStock() < 0) {
            Saldo insuficiente: a saída deixaria o estoque em {{ resultingStock() }}.
          } @else {
            Saldo depois da movimentação: <strong>{{ resultingStock() }}</strong>
          }
        </p>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button type="button" class="cp-btn cp-btn-ghost" (click)="close()">Cancelar</button>
      <button type="button" class="cp-btn cp-btn-primary" [disabled]="form.invalid || resultingStock() < 0"
              (click)="confirm()">
        Registrar
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    :host {
      display: block;
    }

    .part-line {
      display: flex;
      flex-direction: column;
      gap: 2px;
      margin-bottom: 20px;
    }

    .current {
      font-size: 13px;
      color: var(--cp-text-secondary);
    }

    .cp-field + .cp-field {
      margin-top: 16px;
    }

    .resulting {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 20px;
      padding: 10px 12px;
      border-radius: var(--cp-radius-sm);
      background: var(--cp-neutral-bg);
      color: var(--cp-neutral-fg);
      font-size: 13px;
    }

    .resulting.negative {
      background: var(--cp-danger-bg);
      color: var(--cp-danger-fg);
    }

    .resulting mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
  `,
})
export class StockMovementDialog {
  protected readonly data = inject<StockMovementDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<StockMovementDialog>);
  private readonly fb = inject(FormBuilder);

  protected readonly types: { value: StockMovementType; label: string }[] = [
    { value: 'INBOUND', label: STOCK_MOVEMENT_LABELS.INBOUND },
    { value: 'OUTBOUND', label: STOCK_MOVEMENT_LABELS.OUTBOUND },
    { value: 'ADJUSTMENT', label: STOCK_MOVEMENT_LABELS.ADJUSTMENT },
  ];

  protected readonly form = this.fb.nonNullable.group({
    type: ['INBOUND' as StockMovementType, [Validators.required]],
    quantity: [1, [Validators.required, Validators.min(0)]],
    reason: [''],
  });

  /** Espelha o formulário em signals para o resumo recalcular a cada digitação. */
  private readonly type = signal<StockMovementType>('INBOUND');
  private readonly quantity = signal(1);

  protected readonly quantityLabel = computed(() =>
    this.type() === 'ADJUSTMENT' ? 'Novo saldo' : 'Quantidade',
  );

  /** Mesma regra do backend, só para antecipar o resultado na tela. */
  protected readonly resultingStock = computed(() => {
    const amount = Number(this.quantity()) || 0;
    switch (this.type()) {
      case 'INBOUND':
        return this.data.currentStock + amount;
      case 'OUTBOUND':
        return this.data.currentStock - amount;
      case 'ADJUSTMENT':
        return amount;
    }
  });

  constructor() {
    this.form.controls.type.valueChanges.subscribe((value) => this.type.set(value));
    this.form.controls.quantity.valueChanges.subscribe((value) => this.quantity.set(Number(value) || 0));
  }

  protected close(): void {
    this.dialogRef.close(null);
  }

  protected confirm(): void {
    if (this.form.invalid || this.resultingStock() < 0) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const body: StockMovementRequest = {
      type: value.type,
      quantity: Number(value.quantity),
      reason: value.reason.trim() || null,
    };
    this.dialogRef.close(body);
  }
}
