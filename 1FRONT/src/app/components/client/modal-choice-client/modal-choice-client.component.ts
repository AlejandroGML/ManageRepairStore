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
  constructor(private dialogRef: MatDialogRef<ModalChoiceClientComponent>,@Inject(MAT_DIALOG_DATA) public data: any) {
    this.dataSource=new MatTableDataSource<Client>(data.users);
    this.rut = data.rut;
  }
  selectClient(client:Client){
    this.dialogRef.close(client);
  }
  close() {
    this.dialogRef.close(null);
  }
}
