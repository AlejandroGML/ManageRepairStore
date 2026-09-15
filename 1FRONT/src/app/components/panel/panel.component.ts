import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ProductsApiService } from '../../services/products.api.service';
import { OrdersApiService } from '../../services/orders.api.service';
import { LogApiService } from '../../services/log.api.service';
import { SalesApiService } from '../../services/sales.api.service';
import { SnackbarService } from '../../services/snackbar.service';
import { AuthService } from '../../services/auth.service';
import { Product } from '../../interface/warehouse';
import { Log } from '../../interface/client';
import { I18nService } from '../../i18n/i18n.service';
import { TPipe } from '../../i18n/t.pipe';

/** KPI del prototipo: label arriba-izq, icono arriba-der, valor grande, sub abajo. */
interface Kpi {
  label: string;
  value: string;
  icon: string;
  tone: 'orange' | 'amber' | 'red' | 'green';
  deltaIcon: string;
  deltaText: string;
  deltaTone: 'up' | 'down' | 'flat';
}

interface ActivityItem {
  icon: string;
  tone: string;
  title: string;
  desc: string;
  user?: string;
  time: string;
}

@Component({
  selector: 'app-panel',
  templateUrl: './panel.component.html',
  styleUrls: ['./panel.component.css'],
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, TPipe],
})
export class PanelComponent implements OnInit {
  private readonly productsApi = inject(ProductsApiService);
  private readonly ordersApi = inject(OrdersApiService);
  private readonly logApi = inject(LogApiService);
  private readonly salesApi = inject(SalesApiService);
  private readonly snackbar = inject(SnackbarService);
  private readonly authService = inject(AuthService);
  private readonly i18n = inject(I18nService);

  kpis: Kpi[] = [];
  lowStock: Product[] = [];
  activity: ActivityItem[] = [];
  loading = true;
  todayLabel = '';

  ngOnInit(): void {
    const label = new Intl.DateTimeFormat('es-CL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(new Date());
    this.todayLabel = label.charAt(0).toUpperCase() + label.slice(1);

    this.productsApi.getActiveProducts().subscribe((products) => {
      const list = products ?? [];
      const catalogCount = list.length;
      const categories = new Set(
        list.map((p) => (p as any).category?.name).filter(Boolean)
      ).size;
      const lowStock = list.filter(
        (p) =>
          p.stock !== undefined &&
          p.minimum !== undefined &&
          p.minimum > 0 &&
          p.stock < p.minimum
      );
      const critical = list.filter(
        (p) => p.stock !== undefined && p.stock <= 2
      ).length;
      this.lowStock = lowStock;

      this.ordersApi.getAllOrders().subscribe((clientsData) => {
        const clients: any[] = clientsData ?? [];
        const orders = clients.reduce(
          (acc: number, c: any) => acc + (c.orders?.length ?? 0),
          0
        );
        const openOrders = clients.reduce(
          (acc: number, c: any) =>
            acc +
            (c.orders?.filter(
              (o: any) =>
                o.status === 'Pendiente' ||
                o.status === 'En reparacion' ||
                o.status === 'En reparación'
            )?.length ?? 0),
          0
        );

        this.salesApi.getTodaySummary().subscribe((summary) => {
          const ventasHoy = Number(summary?.total) || 0;
          const ventasCount = Number(summary?.count) || 0;

          // Cada KPI tiene su propio sub — binding cruzado es el bug MRS #7.
          this.kpis = [
            {
              label: this.i18n.t('panel.kpiTodaySales'),
              value: `$${ventasHoy.toLocaleString('es-CL')}`,
              icon: 'payments',
              tone: 'orange',
              deltaIcon: 'receipt_long',
              deltaText: this.i18n.t('panel.kpiSalesDelta', { count: ventasCount }),
              deltaTone: 'flat',
            },
            {
              label: this.i18n.t('panel.kpiOpenOrders'),
              value: `${openOrders}`,
              icon: 'assignment',
              tone: 'green',
              deltaIcon: 'schedule',
              deltaText: this.i18n.t('panel.kpiOrdersDelta', { count: orders }),
              deltaTone: 'flat',
            },
            {
              label: this.i18n.t('panel.kpiLowStock'),
              value: `${lowStock.length}`,
              icon: 'warning',
              tone: 'amber',
              deltaIcon: 'trending_down',
              deltaText: this.i18n.t('panel.kpiCriticalDelta', { count: critical }),
              deltaTone: 'down',
            },
            {
              label: this.i18n.t('panel.kpiCatalog'),
              value: `${catalogCount}`,
              icon: 'category',
              tone: 'red',
              deltaIcon: 'inventory_2',
              deltaText: this.i18n.t('panel.kpiCategoriesDelta', { count: categories }),
              deltaTone: 'flat',
            },
          ];
          this.loading = false;
        });
      });
    });

    // Actividad reciente estilo negocio: título + descripción + hora a la derecha.
    this.logApi.getData().subscribe((logs: any) => {
      const list: Log[] = Array.isArray(logs) ? logs : [];
      const sorted = [...list].sort(
        (a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime()
      );
      this.activity = sorted.slice(0, 5).map((l) => {
        const action = (l.action ?? '').toLowerCase();
        const isSale = action.startsWith('venta');
        const isRefill = action.startsWith('reposición') || action.startsWith('reposicion');
        const isRepuesto = action.startsWith('repuestos');
        return {
          icon: isSale ? 'point_of_sale' : isRefill ? 'inventory' : isRepuesto ? 'engineering' : 'assignment_add',
          tone: isSale ? 'orange' : isRefill ? 'amber' : isRepuesto ? 'green' : 'green',
          title: l.action,
          desc: l.clientName ?? '',
          user: l.userName ?? undefined,
          time: this.feedTime(l.date),
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
    if (d.getTime() >= startYesterday) return this.i18n.t('panel.yesterday');
    return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
  }

  stockBadgeClass(stock?: number): string {
    if (stock === undefined || stock <= 2) return 'badge-error';
    return 'badge-warning';
  }

  /** "Nueva orden" lives behind an admin-only route. */
  get isAdmin(): boolean {
    return this.authService.getCurrentUser()?.role === 'admin';
  }

  stockBadgeLabel(stock?: number): string {
    if (stock === undefined || stock <= 2) return this.i18n.t('panel.badgeCritical');
    return this.i18n.t('panel.badgeLow');
  }

  exportLowStock(): void {
    if (!this.lowStock.length) {
      this.snackbar.openSnackBar(this.i18n.t('panel.exportEmpty'));
      return;
    }
    this.productsApi.exportLowStockXlsx().subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `stock-bajo-${new Date().toISOString().slice(0, 10)}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.snackbar.openSnackBar(this.i18n.t('panel.exportError')),
    });
  }
}
