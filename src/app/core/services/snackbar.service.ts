/**
 * SnackbarService - Serviço de notificações toast/snackbar
 * Usa Angular Material MatSnackBar para feedback consistente ao usuário
 */
import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
export class SnackbarService {
  constructor(private snackBar: MatSnackBar) {}

  /** Exibe mensagem de sucesso */
  success(message: string): void {
    this.snackBar.open(message, 'Fechar', {
      duration: 4000,
      panelClass: ['snackbar-success'],
      horizontalPosition: 'end',
      verticalPosition: 'top',
    });
  }

  /** Exibe mensagem de erro */
  error(message: string): void {
    this.snackBar.open(message, 'Fechar', {
      duration: 5000,
      panelClass: ['snackbar-error'],
      horizontalPosition: 'end',
      verticalPosition: 'top',
    });
  }

  /** Exibe mensagem informativa */
  info(message: string): void {
    this.snackBar.open(message, 'Fechar', {
      duration: 4000,
      panelClass: ['snackbar-info'],
      horizontalPosition: 'end',
      verticalPosition: 'top',
    });
  }

  /** Exibe mensagem de alerta */
  warning(message: string): void {
    this.snackBar.open(message, 'Fechar', {
      duration: 4000,
      panelClass: ['snackbar-warning'],
      horizontalPosition: 'end',
      verticalPosition: 'top',
    });
  }
}
