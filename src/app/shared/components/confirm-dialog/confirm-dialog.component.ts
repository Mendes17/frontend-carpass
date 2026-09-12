/**
 * ConfirmDialogComponent - Dialog de confirmação reutilizável
 * Usado para ações destrutivas como exclusão de veículos
 */
import { Component, inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

@Component({
  selector: 'cp-confirm-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="dialog-container">
      <!-- Ícone do tipo de ação -->
      <div class="dialog-icon" [class]="'icon-' + data.type">
        <mat-icon>
          {{ data.type === 'danger' ? 'warning' : data.type === 'warning' ? 'info' : 'help_outline' }}
        </mat-icon>
      </div>

      <h2 class="dialog-title">{{ data.title }}</h2>
      <p class="dialog-message">{{ data.message }}</p>

      <div class="dialog-actions">
        <button class="cp-btn cp-btn-ghost" (click)="onCancel()">
          {{ data.cancelText || 'Cancelar' }}
        </button>
        <button
          class="cp-btn"
          [class.cp-btn-danger]="data.type === 'danger'"
          [class.cp-btn-primary]="data.type !== 'danger'"
          (click)="onConfirm()"
        >
          {{ data.confirmText || 'Confirmar' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .dialog-container {
      padding: 32px;
      text-align: center;
      max-width: 400px;
      background: var(--cp-bg-card);
    }
    .dialog-icon {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
    }
    .dialog-icon mat-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
    }
    .icon-danger {
      background: var(--cp-danger-bg);
      color: var(--cp-danger);
    }
    .icon-warning {
      background: var(--cp-warning-bg);
      color: var(--cp-warning);
    }
    .icon-info {
      background: var(--cp-info-bg);
      color: var(--cp-info);
    }
    .dialog-title {
      font-size: 18px;
      font-weight: 600;
      color: var(--cp-text);
      margin-bottom: 8px;
    }
    .dialog-message {
      font-size: 14px;
      color: var(--cp-text-secondary);
      margin-bottom: 24px;
      line-height: 1.5;
    }
    .dialog-actions {
      display: flex;
      gap: 12px;
      justify-content: center;
    }
  `]
})
export class ConfirmDialogComponent {
  readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<ConfirmDialogComponent>);

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
