import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ProductsApiService } from 'src/app/services/products.api.service';
import { SnackbarService } from 'src/app/services/snackbar.service';
import { Product } from 'src/app/interface/warehouse';

interface AisleCard {
  aisle: string;
  positions: number;
  deltaIcon: string;
  deltaText: string;
  deltaTone: 'up' | 'down' | 'flat';
}

interface StockRow {
  location: string;
  productName: string;
  stock: number;
  min: number;
  tone: 'ok' | 'warn' | 'crit';
}

@Component({
  selector: 'app-warehouse',
  templateUrl: './warehouse.component.html',
  styleUrls: ['./warehouse.component.css'],
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
})
export class WarehouseComponent implements OnInit {
  aisleCards: AisleCard[] = [];
  stockRows: StockRow[] = [];
  loading = true;

  private readonly productsApi = inject(ProductsApiService);
  private readonly snackbar = inject(SnackbarService);

  ngOnInit(): void {
    this.productsApi.getProductsWithLastTransaction().subscribe((products) => {
      // Filas stock por ubicación (orden por código de ubicación)
      this.stockRows = products
        .filter((p) => (p.location ?? '') !== '' && p.location !== 'Sin asignar' && p.location !== 'Sin Datos')
        .map((p) => ({
          location: p.location as string,
          productName: p.name,
          stock: p.stock ?? 0,
          min: p.minimum ?? 5,
          tone: this.toneFor(p.stock ?? 0, p.minimum ?? 5),
        }))
        .sort((a, b) => a.location.localeCompare(b.location));

      // Tarjetas por pasillo (prefijo de ubicación: A/B/C)
      const aisles = new Map<string, string[]>();
      for (const row of this.stockRows) {
        const aisle = row.location.charAt(0).toUpperCase();
        aisles.set(aisle, [...(aisles.get(aisle) ?? []), row.location]);
      }
      this.aisleCards = ['A', 'B', 'C'].map((aisle) => {
        const positions = aisles.get(aisle)?.length ?? 0;
        return {
          aisle,
          positions,
          deltaIcon: 'inventory_2',
          deltaText: `${positions} posiciones usadas`,
          deltaTone: 'flat' as const,
        };
      });

      this.loading = false;
    });
  }

  private toneFor(stock: number, min: number): 'ok' | 'warn' | 'crit' {
    const ratio = stock / Math.max(1, min);
    if (ratio < 0.5) return 'crit';
    if (ratio < 1) return 'warn';
    return 'ok';
  }

  /** Nivel de la barra: stock/mínimo, tope 100%. */
  stockPct(stock: number, min: number): number {
    return Math.min(100, Math.round((stock / Math.max(1, min)) * 100));
  }

  reconcile(): void {
    this.snackbar.success('Reconciliación ejecutada (demo)');
  }
}
