import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { SHARED_IMPORTS } from 'src/app/shared.imports';
import { OrdenIngreso } from 'src/app/interface/ficha-tecnica';
import { MatTableDataSource } from '@angular/material/table';
import { NamePipe } from 'src/app/pipes/name.pipe';
import { RutPipe } from 'src/app/pipes/rut.pipe';

@Component({
  selector: 'app-pdf',
  templateUrl: './pdf.component.html',
  styleUrls: ['./pdf.component.css'],
  standalone: true,
  imports: [SHARED_IMPORTS, NamePipe, RutPipe],
})

export class PdfComponent implements OnChanges {

  constructor() { }

  @Input() ordenIngreso: OrdenIngreso = {
    'name':'',
    'rut':'',
    'address':'', 
    'city':'',
    'phone':'',
    'code':0,
    'date': new Date(),
    'email':'',
    'description':'',
    'observation':'',
    'qr':'',
    'status':''
  }

  dataSource: MatTableDataSource<OrdenIngreso> | any;
  imgPdf:string = '';
  ngOnChanges(changes: SimpleChanges | any) {
    if (changes['ordenIngreso']) {
      this.dataSource = new MatTableDataSource<OrdenIngreso>([this.ordenIngreso]);
    }
  }

}