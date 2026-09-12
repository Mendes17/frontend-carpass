import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { MaintenanceRecordRequest } from '../../core/models/vehicle.model';

/**
 * Lançamento manual no histórico do veículo.
 *
 * Serve para o que foi feito fora daqui — na concessionária, em outra oficina,
 * pelo próprio dono. Sem isso a linha do tempo teria buracos e a quilometragem
 * pularia sem explicação.
 */
@Component({
  selector: 'cp-maintenance-record-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>Lançar manutenção externa</h2>

    <mat-dialog-content>
      <p class="intro">
        Use para registrar um serviço feito fora desta oficina. O que foi feito aqui já entra sozinho,
        pela ordem de serviço.
      </p>

      <form [formGroup]="form" novalidate>
        <div class="two-up">
          <div class="cp-field">
            <label class="cp-label" for="serviceDate">Data</label>
            <input id="serviceDate" type="date" class="cp-input" formControlName="serviceDate"
                   [class.error]="form.controls.serviceDate.touched && form.controls.serviceDate.invalid" />
            @if (form.controls.serviceDate.touched && form.controls.serviceDate.invalid) {
              <span class="cp-error-msg">Informe a data do serviço.</span>
            }
          </div>

          <div class="cp-field">
            <label class="cp-label" for="recordMileage">Quilometragem</label>
            <input id="recordMileage" type="number" min="0" step="1" class="cp-input" formControlName="mileage" />
          </div>
        </div>

        <div class="cp-field">
          <label class="cp-label" for="recordDescription">O que foi feito</label>
          <input id="recordDescription" type="text" class="cp-input" formControlName="description"
                 placeholder="Revisão de 40.000 km na concessionária"
                 [class.error]="form.controls.description.touched && form.controls.description.invalid" />
          @if (form.controls.description.touched && form.controls.description.invalid) {
            <span class="cp-error-msg">Descreva o serviço.</span>
          }
        </div>

        <div class="two-up">
          <div class="cp-field">
            <label class="cp-label" for="performedBy">Quem executou</label>
            <input id="performedBy" type="text" class="cp-input" formControlName="performedBy"
                   placeholder="Nome da oficina ou concessionária" />
          </div>

          <div class="cp-field">
            <label class="cp-label" for="recordAmount">Valor pago (R$)</label>
            <input id="recordAmount" type="number" min="0" step="0.01" class="cp-input" formControlName="amount" />
          </div>
        </div>

        <div class="cp-field">
          <label class="cp-label" for="recordNotes">Observações</label>
          <textarea id="recordNotes" class="cp-input cp-textarea" formControlName="notes"></textarea>
        </div>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button type="button" class="cp-btn cp-btn-ghost" (click)="close()">Cancelar</button>
      <button type="button" class="cp-btn cp-btn-primary" [disabled]="form.invalid" (click)="confirm()">
        Lançar
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    :host {
      display: block;
    }
    .intro {
      margin: 0 0 20px;
      font-size: 13px;
      color: var(--cp-text-secondary);
    }
        /* A regra de espaçamento entre campos empilhados não vale dentro da grade
       de duas colunas: lá os campos são irmãos lado a lado, e o margin-top
       empurrava o segundo para baixo, desalinhando os dois rótulos. */
    .two-up .cp-field + .cp-field {
      margin-top: 0;
    }

    .two-up {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .cp-field + .cp-field,
    .two-up + .cp-field,
    .cp-field + .two-up,
    .two-up + .two-up {
      margin-top: 16px;
    }
    @media (max-width: 480px) {
      .two-up {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class MaintenanceRecordDialog {
  private readonly dialogRef = inject(MatDialogRef<MaintenanceRecordDialog>);
  private readonly fb = inject(FormBuilder);

  protected readonly form = this.fb.nonNullable.group({
    serviceDate: ['', [Validators.required]],
    mileage: [null as number | null, [Validators.min(0)]],
    description: ['', [Validators.required, Validators.maxLength(255)]],
    performedBy: [''],
    amount: [null as number | null, [Validators.min(0)]],
    notes: [''],
  });

  protected close(): void {
    this.dialogRef.close(null);
  }

  protected confirm(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const body: MaintenanceRecordRequest = {
      serviceDate: value.serviceDate,
      mileage: numberOrNull(value.mileage),
      description: value.description.trim(),
      performedBy: value.performedBy.trim() || null,
      amount: numberOrNull(value.amount),
      notes: value.notes.trim() || null,
    };
    this.dialogRef.close(body);
  }
}

/** Campo numérico vazio chega como string vazia, e `Number('')` é zero. */
function numberOrNull(value: number | null): number | null {
  if (value === null || value === undefined || (value as unknown) === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
