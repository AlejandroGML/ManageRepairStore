import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

/**
 * Pantalla unificada de Bodega: gestiona productos (Inventario) y
 * reposiciones desde una sola entrada, con tabs internas.
 */
@Component({
  selector: 'app-bodega',
  templateUrl: './bodega.component.html',
  styleUrls: ['./bodega.component.css'],
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
})
export class BodegaComponent {}