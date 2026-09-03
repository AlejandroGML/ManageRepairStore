import { Component, Inject } from '@angular/core';
import { SHARED_IMPORTS } from 'src/app/shared.imports';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatDialogRef } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import {  Client } from 'src/app/interface/client';
import { NamePipe } from 'src/app/pipes/name.pipe';
import { RutPipe } from 'src/app/pipes/rut.pipe';

@Component({
  selector: 'app-modal-choice-client',
  templateUrl: './modal-choice-client.component.html',
  standalone: true,
  imports: [SHARED_IMPORTS, NamePipe, RutPipe],
  styleUrls: ['./modal-choice-client.component.css']
})
export class ModalChoiceClientComponent {
  displayedColumns: string[] = ['id','name','rut', 'address', 'phone','email','company_name'];
  rut:string = '';
  dataSource = new MatTableDataSource<Client>([]);

  /** Paginación (mismo patrón custom que la pantalla de productos, 10 por página). */
  pageSize = 10;
  pageIndex = 0;

  constructor(private dialogRef: MatDialogRef<ModalChoiceClientComponent>,@Inject(MAT_DIALOG_DATA) public data: any) {
    this.dataSource=new MatTableDataSource<Client>(data.users);
    this.rut = data.rut;
  }

  get pageCount(): number { return Math.max(1, Math.ceil(this.dataSource.data.length / this.pageSize)); }
  get startIndex(): number { return Math.min(this.pageIndex * this.pageSize, this.dataSource.data.length); }
  get endIndex(): number { return Math.min(this.startIndex + this.pageSize, this.dataSource.data.length); }
  get pageClients(): Client[] { return this.dataSource.data.slice(this.startIndex, this.endIndex); }
  /**
   * Páginas visibles con ventana compacta (primera, última, actual ±1 y elipsis).
   */
  get visiblePages(): (number | '…')[] {
    const total = this.pageCount;
    if (total <= 7) return Array.from({ length: total }, (_, i) => i);
    const current = this.pageIndex;
    const pages: (number | '…')[] = [0];
    if (current > 2) pages.push('…');
    for (let i = Math.max(1, current - 1); i <= Math.min(total - 2, current + 1); i++) pages.push(i);
    if (current < total - 3) pages.push('…');
    pages.push(total - 1);
    return pages;
  }

  goPage(page: number): void {
    if (page >= 0 && page < this.pageCount) this.pageIndex = page;
  }

  selectClient(client:Client){
    this.dialogRef.close(client);
  }
  close() {
    this.dialogRef.close(null);
  }
}
