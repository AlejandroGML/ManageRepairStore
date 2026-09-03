import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ProductsApiService } from 'src/app/services/products.api.service';
import { ClientsApiService } from 'src/app/services/clients.api.service';
import { OrdersApiService } from 'src/app/services/orders.api.service';
import { AdminApiService } from 'src/app/services/admin.api.service';
import { SalesApiService } from 'src/app/services/sales.api.service';
import { SnackbarService } from 'src/app/services/snackbar.service';
import { Product } from 'src/app/interface/warehouse';
import { Log } from 'src/app/interface/client';

/** KPI del prototipo: label arriba-izq, icono arriba-der, valor grande, delta abajo. */
interface Kpi {
  label: string;
  value: string;
  icon: string;
  tone: 'violet' | 'teal' | 'amber' | 'red';
  deltaIcon: string;
  deltaText: string;
  deltaTone: 'up' | 'down' | 'flat';
}

interface ActivityItem {
  icon: string;
  tone: string;
  title: string;
  desc: string;
  time: string;
}

@Component({
  selector: 'app-panel',
  templateUrl: './panel.component.html',
  styleUrls: ['./panel.component.css'],
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
})
export class PanelComponent implements OnInit {
  private readonly productsApi = inject(ProductsApiService);
  private readonly clientsApi = inject(ClientsApiService);
  private readonly ordersApi = inject(OrdersApiService);
  private readonly adminApi = inject(AdminApiService);
  private readonly salesApi = inject(SalesApiService);
  private readonly snackbar = inject(SnackbarService);

  kpis: Kpi[] = [];
  lowStock: Product[] = [];
  activity: ActivityItem[] = [];
  loading = true;
  todayLabel = '';

  ngOnInit(): void {
    this.todayLabel = new Intl.DateTimeFormat('es-CL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(new Date());
    this.todayLabel = this.todayLabel.charAt(0).toUpperCase() + this.todayLabel.slice(1);

    this.productsApi.getProductsWithLastTransaction().subscribe((products) => {
      const catalogCount = products.length;
      const categories = new Set(products.map((p) => p.category?.name).filter(Boolean)).size;
      const lowStock = products.filter((p) => p.stock !== undefined && p.minimum !== undefined && p.stock < p.minimum);
      const critical = products.filter((p) => p.stock !== undefined && p.stock <= 2).length;
      this.lowStock = lowStock;

      this.ordersApi.getAllOrders().subscribe((clientsData) => {
        const orders = clientsData.reduce((acc, c) => acc + (c.orders?.length ?? 0), 0);
        const inRepair = clientsData.reduce(
          (acc, c) => acc + (c.orders?.filter((o) => o.status === 'En reparacion' || o.status === 'En reparación')?.length ?? 0),
          0,
        );

        this.salesApi.getSales().subscribe((sales) => {
          const now = new Date();
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
          const yesterday = today - 86400000;
          const sum = (from: number, to: number) =>
            (sales ?? [])
              .filter((s) => {
                const t = new Date(s.createdAt ?? '').getTime();
                return t >= from && t < to;
              })
              .reduce((acc, s) => acc + (Number(s.total) || 0), 0);
          const ventasHoy = sum(today, today + 86400000);
          const ventasAyer = sum(yesterday, today);
          const delta = ventasAyer > 0 ? ((ventasHoy - ventasAyer) / ventasAyer) * 100 : 0;

          this.kpis = [
            {
              label: 'Ventas de hoy',
              value: `$${ventasHoy.toLocaleString('es-CL')}`,
              icon: 'payments',
              tone: 'teal',
              deltaIcon: delta >= 0 ? 'trending_up' : 'trending_down',
              deltaText: `${delta >= 0 ? '+' : ''}${delta.toFixed(1).replace('.', ',')}% vs ayer`,
              deltaTone: delta >= 0 ? 'up' : 'down',
            },
            { label: 'Órdenes abiertas', value: `${orders}`, icon: 'assignment', tone: 'violet', deltaIcon: 'schedule', deltaText: `${inRepair} en reparación`, deltaTone: 'flat' },
            { label: 'Stock bajo', value: `${lowStock.length}`, icon: 'warning', tone: 'amber', deltaIcon: 'trending_down', deltaText: `${critical} críticos`, deltaTone: 'down' },
            { label: 'Catálogo', value: `${catalogCount}`, icon: 'category', tone: 'violet', deltaIcon: 'inventory_2', deltaText: `${categories} categorías`, deltaTone: 'flat' },
          ];
          this.loading = false;
        });
      });
    });

    // Actividad reciente estilo prototipo: título + descripción + hora a la derecha
    this.adminApi.getLog().subscribe((logs: any) => {
      const list: Log[] = Array.isArray(logs) ? logs : [];
      this.activity = list.slice(0, 4).map((l) => {
        const isSale = l.action.toLowerCase().startsWith('venta');
        const isRefill = l.action.toLowerCase().startsWith('reposición');
        return {
          icon: isSale ? 'point_of_sale' : isRefill ? 'package_2' : 'assignment_add',
          tone: isSale ? 'teal' : isRefill ? 'amber' : 'violet',
          title: l.action,
          desc: l.clientName ?? '',
          time: this.feedTime((l as any).createdAt ?? l.date),
        };
      });
    });
  }

  /** Feed time: HH:MM si es hoy, "Ayer" si fue ayer, fecha corta en otro caso. */
  private feedTime(date: Date | string | undefined): string {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (d.getTime() >= startToday.getTime()) {
      return d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
    }
    const startYesterday = startToday.getTime() - 86400000;
    if (d.getTime() >= startYesterday) return 'Ayer';
    return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
  }

  stockTone(stock?: number): string {
    if (stock === undefined || stock <= 2) return 'crit';
    return 'warn';
  }

  stockBadgeClass(stock?: number): string {
    if (stock === undefined || stock <= 2) return 'badge-error';
    return 'badge-warning';
  }

  stockBadgeLabel(stock?: number): string {
    if (stock === undefined || stock <= 2) return 'Crítico';
    return 'Bajo';
  }

  exportLowStockCsv(): void {
    if (!this.lowStock.length) {
      this.snackbar.openSnackBar('Sin alertas de stock bajo para exportar');
      return;
    }
    const header = 'Producto,Stock,Mínimo\n';
    const rows = this.lowStock.map((p) => `${p.name},${p.stock},${p.minimum ?? ''}`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stock-bajo.csv';
    a.click();
    URL.revokeObjectURL(url);
  }
}
