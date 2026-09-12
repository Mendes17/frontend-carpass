import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export interface SendQuoteDialogData {
  customerName: string;
  /** E-mail do cadastro do cliente, quando existe. */
  customerEmail: string | null;
  /** Muda o texto: enviar pela primeira vez ou reenviar. */
  resend: boolean;
}

/**
 * Confirma para onde a proposta será enviada.
 *
 * O endereço digitado aqui vale só para este envio e não altera o cadastro do
 * cliente — a proposta pode precisar ir para o e-mail do escritório, do filho,
 * de quem de fato decide. Quem o envio atingiu fica registrado junto ao link.
 */
@Component({
  selector: 'cp-send-quote-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>{{ data.resend ? 'Reenviar orçamento' : 'Enviar orçamento ao cliente' }}</h2>

    <mat-dialog-content>
      <p class="intro">
        {{ data.resend ? 'O link anterior deixa de valer.' : 'O cliente recebe os valores por e-mail' }}
        {{ data.resend ? 'O cliente recebe um link novo para aprovar ou recusar.' : 'e responde pelo próprio link, sem precisar de conta.' }}
      </p>

      <form [formGroup]="form" novalidate>
        <div class="cp-field">
          <label class="cp-label" for="quote-email">E-mail de {{ data.customerName }}</label>
          <input id="quote-email" type="email" class="cp-input" formControlName="email"
                 placeholder="cliente@email.com"
                 [class.error]="form.controls.email.touched && form.controls.email.invalid" />
          @if (form.controls.email.touched && form.controls.email.invalid) {
            <span class="cp-error-msg">Informe um e-mail válido.</span>
          } @else if (data.customerEmail) {
            <span class="field-hint">Veio do cadastro. Pode trocar só para este envio.</span>
          } @else {
            <span class="field-hint">
              Este cliente não tem e-mail cadastrado. O endereço digitado aqui vale só para este envio.
            </span>
          }
        </div>
      </form>

      <p class="sem-email">
        <mat-icon aria-hidden="true">info</mat-icon>
        Sem e-mail, o orçamento fica aguardando resposta e a decisão é registrada pelo gerente ou proprietário.
      </p>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button type="button" class="cp-btn cp-btn-ghost" (click)="close()">Cancelar</button>
      @if (!data.resend) {
        <button type="button" class="cp-btn cp-btn-ghost" (click)="semEmail()">Enviar sem e-mail</button>
      }
      <button type="button" class="cp-btn cp-btn-primary" [disabled]="form.invalid || !form.controls.email.value"
              (click)="confirm()">
        {{ data.resend ? 'Reenviar' : 'Enviar' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    :host {
      display: block;
    }
    .intro {
      margin: 0 0 20px;
      font-size: 14px;
      line-height: 1.6;
      color: var(--cp-text-secondary);
    }
    .sem-email {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      margin: 20px 0 0;
      padding: 10px 12px;
      border-radius: var(--cp-radius-sm);
      background: var(--cp-neutral-bg);
      color: var(--cp-neutral-fg);
      font-size: 13px;
      line-height: 1.5;
    }
    .sem-email mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      flex-shrink: 0;
    }
  `,
})
export class SendQuoteDialog {
  protected readonly data = inject<SendQuoteDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<SendQuoteDialog>);
  private readonly fb = inject(FormBuilder);

  protected readonly form = this.fb.nonNullable.group({
    email: [this.data.customerEmail ?? '', [Validators.email]],
  });

  protected close(): void {
    this.dialogRef.close(undefined);
  }

  /** Segue sem enviar nada: a gerência registra a decisão depois. */
  protected semEmail(): void {
    this.dialogRef.close({ email: null });
  }

  protected confirm(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.dialogRef.close({ email: this.form.getRawValue().email.trim() });
  }
}
