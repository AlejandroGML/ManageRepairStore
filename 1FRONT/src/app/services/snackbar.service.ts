import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { I18nService } from '../i18n/i18n.service';

@Injectable({
  providedIn: 'root'
})
export class SnackbarService {
  private readonly snackBar: MatSnackBar = inject(MatSnackBar);
  private readonly i18n = inject(I18nService);

  private get closeLabel(): string {
    return this.i18n.t('common.close');
  }

  openSnackBar(message: string): void {
    this.snackBar.open(message, this.closeLabel, {
      duration: 6000,
      direction:'ltr',
      horizontalPosition:'right',
      verticalPosition:'top',
    });
  }

  success(message: string): void {
    this.snackBar.open(message, this.closeLabel, {
      duration: 4000,
      direction: 'ltr',
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: ['snackbar-success'],
    });
  }

  error(message: string): void {
    this.snackBar.open(message, this.closeLabel, {
      duration: 8000,
      direction: 'ltr',
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: ['snackbar-error'],
    });
  }
}
