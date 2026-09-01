import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ProductsApiService } from 'src/app/services/products.api.service';
import { ClientsApiService } from 'src/app/services/clients.api.service';
import { OrdersApiService } from 'src/app/services/orders.api.service';
import { AdminApiService } from 'src/app/services/admin.api.service';
import { Product } from 'src/app/interface/warehouse';
import { Log } from 'src/app/interface/client';

interface Kpi {
  label: string;
  value: number;
  icon: string;
  tone: 'violet' | 'teal' | 'amber' | 'red';
  sub: string;
}

interface ActivityItem {
  icon: string;
  tone: string;
  title: string;
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

    this.productsApi.getProductsWithLastTransaction().subscribe((products) => {
      this.clientsApi.getCountClients().subscribe((clients) => {
        this.ordersApi.getAllOrders().subscribe((ordersData) => {
          const orders = ordersData.reduce((acc, c) => acc + (c.orders?.length ?? 0), 0);
          const lowStock = products.filter((p) => p.stock !== undefined && p.stock <= 8);
          this.lowStock = lowStock.slice(0, 6);
          this.kpis = [
            { label: 'Productos en catálogo', value: products.length, icon: 'category', tone: 'violet', sub: `${clients} clientes registrados` },
            { label: 'Órdenes de ingreso', value: orders, icon: 'assignment', tone: 'teal', sub: `${lowStock.length} con stock bajo` },
            { label: 'Stock bajo', value: lowStock.length, icon: 'warning', tone: 'amber', sub: 'punto de reposición: 8' },
            { label: 'Clientes', value: clients, icon: 'groups', tone: 'red', sub: 'registrados en el sistema' },
          ];
          this.loading = false;
        });
      });
    });

    // Recent activity from logs
    this.adminApi.getLog().subscribe((logs: any) => {
      const list: Log[] = Array.isArray(logs) ? logs : [];
      this.activity = list.slice(0, 5).map((l) => ({
        icon: l.action.includes('venta') ? 'point_of_sale' : l.action.includes('repuso') ? 'add_box' : 'assignment',
        tone: l.action.includes('venta') ? 'teal' : l.action.includes('repuso') ? 'amber' : 'violet',
        title: `${l.userName} ${l.action}`,
        time: this.relativeTime((l as any).createdAt ?? l.date),
      }));
    });
  }

  private relativeTime(date: Date | string | undefined): string {
    if (!date) return '';
    const d = new Date(date);
    const diffH = (Date.now() - d.getTime()) / 3600000;
    if (diffH < 1) return 'hace un momento';
    if (diffH < 24) return `hace ${Math.round(diffH)} h`;
    return `hace ${Math.round(diffH / 24)} d`;
  }

  stockTone(stock?: number): string {
    if (stock === undefined || stock <= 3) return 'crit';
    if (stock <= 8) return 'warn';
    return 'ok';
  }

  stockBadgeClass(stock?: number): string {
    if (stock === undefined || stock <= 3) return 'badge-error';
    return 'badge-warning';
  }

  stockBadgeLabel(stock?: number): string {
    if (stock === undefined || stock <= 3) return 'Crítico';
    return 'Bajo';
  }

  exportLowStockCsv(): void {
    const header = 'Producto,Stock\n';
    const rows = this.lowStock.map((p) => `${p.name},${p.stock}`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stock-bajo.csv';
    a.click();
    URL.revokeObjectURL(url);
  }
}