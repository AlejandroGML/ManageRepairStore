import { Component, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { CompanyInfo } from 'src/app/services/clients.api.service';

export interface CompanySimilarResult {
  action: 'use' | 'create';
  company?: CompanyInfo;
}

/**
 * Gatillante B: se escribió un nombre de empresa que no está inscrito pero
 * se parece a otros ya registrados. El Admin rectifica (usar existente) o
 * continúa con la creación de la nueva empresa.
 */
@Component({
  selector: 'app-modal-company-similar',
  templateUrl: './modal-company-similar.component.html',
  styleUrls: ['./modal-company-similar.component.css'],
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatIconModule],
})
export class ModalCompanySimilarComponent {
  private readonly dialogRef = inject<MatDialogRef<ModalCompanySimilarComponent>>(MatDialogRef);

  query: string;
  companies: CompanyInfo[];

  constructor(@Inject(MAT_DIALOG_DATA) data: { query: string; companies: CompanyInfo[] }) {
    this.query = data.query;
    this.companies = data.companies;
  }

  useCompany(company: CompanyInfo): void {
    this.dialogRef.close({ action: 'use', company } as CompanySimilarResult);
  }

  createNew(): void {
    this.dialogRef.close({ action: 'create' } as CompanySimilarResult);
  }

  close(): void {
    this.dialogRef.close();
  }
}