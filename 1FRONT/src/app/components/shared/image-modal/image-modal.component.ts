import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { getApiUrl } from 'src/app/services/api-url';
import { TPipe } from '../../../i18n/t.pipe';

@Component({
  selector: 'app-image-modal',
  standalone: true,
  imports: [MatButtonModule, MatDialogModule, MatIconModule, TPipe],
  template: `
    <div mat-dialog-title class="image-modal-title">
      <span>{{ 'sharedModal.image.title' | t }}</span>
      <button mat-icon-button mat-dialog-close [attr.aria-label]="'common.close' | t">
        <mat-icon>close</mat-icon>
      </button>
    </div>
    <mat-dialog-content class="image-modal-content">
      <img [src]="getFullImageUrl(data.imageUrl)" [alt]="'sharedModal.image.alt' | t" style="max-width: 100%; max-height: 70vh; object-fit: contain;" />
    </mat-dialog-content>
  `,
  styles: [`
    .image-modal-title { display: flex; justify-content: space-between; align-items: center; }
    .image-modal-content { display: flex; justify-content: center; padding: 0; }
  `]
})
export class ImageModalComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: { imageUrl: string }) {}

  // Build full URL if image is relative (assets/ pass through untouched)
  getFullImageUrl(imagePath: string): string {
    if (!imagePath) return '';
    if (imagePath.startsWith('http') || imagePath.startsWith('assets/')) return imagePath;
    return `${getApiUrl()}/${imagePath.replace(/^\/+/, '')}`;
  }
}
