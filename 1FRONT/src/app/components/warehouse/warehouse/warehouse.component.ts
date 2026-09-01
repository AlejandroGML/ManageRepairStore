import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ProductsApiService } from 'src/app/services/products.api.service';
import { SnackbarService } from 'src/app/services/snackbar.service';
import { Product } from 'src/app/interface/warehouse';

interface LocationCard {
  location: string;
  count: number;
  stockSum: number;
}

interface StockRow {
  location: string;
  productName: string;
  stock: number;
  min: number;
  tone: 'ok' | 'warn' | 'crit';
}

const MIN_STOCK = 5;

@Component({
  selector: 'app-warehouse',
  templateUrl: './warehouse.component.html',
  styleUrls: ['./warehouse.component.css'],
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
})
export class WarehouseComponent implements OnInit {
  locationCards: LocationCard[] = [];
  stockRows: StockRow[] = [];
  loading = true;

  private readonly productsApi = inject(ProductsApiService);
  private readonly snackbar = inject(SnackbarService);

  ngOnInit(): void {
    this.productsApi.getProductsWithLastTransaction().subscribe((products) => {
      const byLocation = new Map<string, Product[]>();
      for (const p of products) {
        const loc = p.location || 'Sin asignar';
        byLocation.set(loc, [...(byLocation.get(loc) ?? []), p]);
      }

      this.locationCards = [...byLocation.entries()].map(([location, items]) => ({
        location,
        count: items.length,
        stockSum: items.reduce((s, p) => s + (p.stock ?? 0), 0),
      }));

      this.stockRows = [...byLocation.entries()].flatMap(([location, items]) =>
        items.map((p) => ({
          location,
          productName: p.name,
          stock: p.stock ?? 0,
          min: MIN_STOCK,
          tone: this.toneFor(p.stock ?? 0),
        })),
      );

      this.loading = false;
    });
  }

  private toneFor(stock: number): 'ok' | 'warn' | 'crit' {
    if (stock <= 3) return 'crit';
    if (stock <= MIN_STOCK) return 'warn';
    return 'ok';
  }

  stockPct(stock: number): number {
    return Math.min(100, Math.round((stock / 20) * 100));
  }

  occupancyPct(loc: LocationCard): number {
    if (loc.count === 1) return 100;
    return Math.round((loc.stockSum / (loc.count * 20)) * 100);
  }

  reconcile(): void {
    this.snackbar.success('Reconciliación ejecutada (demo)');
  }
}