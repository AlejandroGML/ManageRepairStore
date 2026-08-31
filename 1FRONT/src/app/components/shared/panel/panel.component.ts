import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ProductsApiService } from 'src/app/services/products.api.service';
import { ClientsApiService } from 'src/app/services/clients.api.service';
import { OrdersApiService } from 'src/app/services/orders.api.service';
import { Product } from 'src/app/interface/warehouse';

interface Kpi {
  label: string;
  value: number;
  icon: string;
  tone: 'violet' | 'teal' | 'amber' | 'red';
}

@Component({
  selector: 'app-panel',
  templateUrl: './panel.component.html',
  styleUrls: ['./panel.component.css'],
  standalone: true,
  imports: [CommonModule, MatIconModule],
})
export class PanelComponent implements OnInit {
  private readonly productsApi = inject(ProductsApiService);
  private readonly clientsApi = inject(ClientsApiService);
  private readonly ordersApi = inject(OrdersApiService);

  kpis: Kpi[] = [];
  lowStock: Product[] = [];
  loading = true;

  ngOnInit(): void {
    this.productsApi.getProductsWithLastTransaction().subscribe((products) => {
      this.clientsApi.getCountClients().subscribe((clients) => {
        this.ordersApi.getAllOrders().subscribe((ordersData) => {
          const orders = ordersData.reduce((acc, c) => acc + (c.orders?.length ?? 0), 0);
          const lowStock = products.filter((p) => p.stock !== undefined && p.stock <= 5);
          this.lowStock = lowStock.slice(0, 6);
          this.kpis = [
            { label: 'Productos en catálogo', value: products.length, icon: 'inventory_2', tone: 'violet' },
            { label: 'Clientes registrados', value: clients, icon: 'groups', tone: 'teal' },
            { label: 'Órdenes de ingreso', value: orders, icon: 'note_add', tone: 'amber' },
            { label: 'Productos con stock bajo', value: lowStock.length, icon: 'warning', tone: 'red' },
          ];
          this.loading = false;
        });
      });
    });
  }
}