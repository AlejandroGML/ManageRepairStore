import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-image-modal',
  standalone: true,
  imports: [MatButtonModule, MatDialogModule, MatIconModule],
  template: `
    <div mat-dialog-title class="image-modal-title">
      <span>Vista previa</span>
      <button mat-icon-button mat-dialog-close aria-label="Cerrar">
        <mat-icon>close</mat-icon>
      </button>
    </div>
    <mat-dialog-content class="image-modal-content">
      <img [src]="getFullImageUrl(data.imageUrl)" alt="Vista previa de imagen" style="max-width: 100%; max-height: 70vh; object-fit: contain;" />
    </mat-dialog-content>
  `,
  styles: [`
    .image-modal-title { display: flex; justify-content: space-between; align-items: center; }
    .image-modal-content { display: flex; justify-content: center; padding: 0; }
  `]
})
export class ImageModalComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: { imageUrl: string }) {}

  // Build full URL if image is relative
  getFullImageUrl(imagePath: string): string {
    if (!imagePath) return '';
    return imagePath.startsWith('http') ? imagePath : `http://localhost:3000${imagePath}`;
  }
}
