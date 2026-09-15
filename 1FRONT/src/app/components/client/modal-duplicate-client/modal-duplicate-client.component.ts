import { Component, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DuplicateMatch } from 'src/app/services/clients.api.service';
import { Client } from 'src/app/interface/client';
import { NamePipe } from 'src/app/pipes/name.pipe';
import { RutPipe } from 'src/app/pipes/rut.pipe';
import { I18nService } from '../../../i18n/i18n.service';
import { TPipe } from '../../../i18n/t.pipe';

export interface DuplicateClientResult {
  action: 'use' | 'edit' | 'create';
  client: Client;
}

/** Etiqueta legible por campo (para el listado de coincidencias). */
const FIELD_LABEL_KEYS: Record<string, string> = {
  rut: 'client.duplicate.fieldRut',
  name: 'client.duplicate.fieldName',
  address: 'client.duplicate.fieldAddress',
  phone: 'client.duplicate.fieldPhone',
  email: 'client.duplicate.fieldEmail',
  company: 'client.duplicate.fieldCompany',
};

/**
 * Gatillante C: hay clientes con datos parecidos a los del formulario.
 * El Admin decide: usar existente (tal cual), editar el existente,
 * crear de todas formas o cancelar (vuelve al formulario intacto).
 */
@Component({
  selector: 'app-modal-duplicate-client',
  templateUrl: './modal-duplicate-client.component.html',
  styleUrls: ['./modal-duplicate-client.component.css'],
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatIconModule, MatTooltipModule, NamePipe, RutPipe, TPipe],
})
export class ModalDuplicateClientComponent {
  private readonly dialogRef = inject<MatDialogRef<ModalDuplicateClientComponent>>(MatDialogRef);
  private readonly i18n = inject(I18nService);

  matches: DuplicateMatch[];

  constructor(@Inject(MAT_DIALOG_DATA) data: { matches: DuplicateMatch[] }) {
    this.matches = data.matches;
  }

  fieldLabel(field: string): string {
    const key = FIELD_LABEL_KEYS[field];
    return key ? this.i18n.t(key) : field;
  }

  /** Similitud legible (85%). */
  pct(similarity: number): string {
    return `${Math.round(similarity * 100)}%`;
  }

  useExisting(client: Client): void {
    this.dialogRef.close({ action: 'use', client } as DuplicateClientResult);
  }

  editExisting(client: Client): void {
    this.dialogRef.close({ action: 'edit', client } as DuplicateClientResult);
  }

  createAnyway(): void {
    this.dialogRef.close({ action: 'create' } as DuplicateClientResult);
  }

  close(): void {
    this.dialogRef.close();
  }
}