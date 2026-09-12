import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export interface GrantAccessDialogData {
  employeeName: string;
  suggestedEmail: string | null;
}

/**
 * Cria a conta de acesso de um funcionário.
 *
 * Não pedimos senha de propósito: a conta nasce sem senha utilizável e o
 * funcionário define a dele pelo link de primeiro acesso. Assim ninguém, nem
 * quem cadastrou, chega a conhecer a senha de outra pessoa.
 */
@Component({
  selector: 'cp-grant-access-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>Dar acesso ao sistema</h2>

    <mat-dialog-content>
      <p class="intro">
        <strong>{{ data.employeeName }}</strong> vai receber um e-mail com um link para definir a
        própria senha. Você não precisa escolher senha nenhuma.
      </p>

      <form [formGroup]="form" (ngSubmit)="confirm()" novalidate>
        <div class="cp-field">
          <label class="cp-label" for="accessEmail">E-mail de acesso</label>
          <input id="accessEmail" type="email" class="cp-input" formControlName="email" autocomplete="off"
                 [class.error]="form.controls.email.touched && form.controls.email.invalid" />
          @if (form.controls.email.touched && form.controls.email.invalid) {
            <span class="cp-error-msg">Informe um e-mail válido.</span>
          }
        </div>
      </form>

      <p class="note">
        <mat-icon aria-hidden="true">info</mat-icon>
        O link vale por tempo limitado e pode ser usado uma única vez.
      </p>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button type="button" class="cp-btn cp-btn-ghost" (click)="close()">Cancelar</button>
      <button type="button" class="cp-btn cp-btn-primary" [disabled]="sending()" (click)="confirm()">
        {{ sending() ? 'Enviando...' : 'Enviar convite' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .intro {
        font-size: 14px;
        line-height: 1.6;
        color: var(--cp-text-secondary);
        margin-bottom: 20px;
      }
      .note {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        margin-top: 16px;
        font-size: 12px;
        color: var(--cp-text-muted);
      }
      .note mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }
    `,
  ],
})
export class GrantAccessDialog {
  protected readonly data = inject<GrantAccessDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<GrantAccessDialog>);
  private readonly fb = inject(FormBuilder);

  protected readonly sending = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    email: [this.data.suggestedEmail ?? '', [Validators.required, Validators.email]],
  });

  protected confirm(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.sending.set(true);
    this.dialogRef.close(this.form.controls.email.value.trim().toLowerCase());
  }

  protected close(): void {
    this.dialogRef.close(null);
  }
}
