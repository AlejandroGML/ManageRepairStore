import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class SnackbarService {
  private readonly snackBar: MatSnackBar = inject(MatSnackBar);

  openSnackBar(message: string): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 6000,
      direction:'ltr',
      horizontalPosition:'right',
      verticalPosition:'top',
    });
  }

  success(message: string): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 4000,
      direction: 'ltr',
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: ['snackbar-success'],
    });
  }

  error(message: string): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 8000,
      direction: 'ltr',
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: ['snackbar-error'],
    });
  }
}
