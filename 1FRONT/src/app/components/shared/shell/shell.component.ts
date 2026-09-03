import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from 'src/app/services/auth.service';
import { ProductsApiService } from 'src/app/services/products.api.service';
import { UserProfile } from 'src/app/interface/user-profile';
import { ThemeToggleComponent } from '../theme-toggle/theme-toggle.component';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  roles: string[];
  badgeKey?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

@Component({
  selector: 'app-shell',
  templateUrl: './shell.component.html',
  styleUrls: ['./shell.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatIconModule, MatTooltipModule, ThemeToggleComponent],
})
export class ShellComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly productsApi = inject(ProductsApiService);

  sidebarOpen = false;
  sidebarCollapsed = false;
  pageTitle = '';
  pageSub = '';
  globalSearch = '';
  pendingRefills = 0;

  readonly navGroups: NavGroup[] = [
    {
      label: 'Principal',
      items: [
        { path: '/panel', label: 'Panel', icon: 'dashboard', roles: ['admin', 'warehouse', 'seller'] },
        { path: '/ventas', label: 'Ventas', icon: 'point_of_sale', roles: ['admin', 'seller'] },
        { path: '/registrar', label: 'Registrar orden', icon: 'assignment_add', roles: ['admin'] },
      ],
    },
    {
      label: 'Inventario',
      items: [
        { path: '/bodega', label: 'Bodega', icon: 'warehouse', roles: ['admin', 'warehouse'], badgeKey: 'refills' },
      ],
    },
    {
      label: 'Gestión',
      items: [{ path: '/clientes', label: 'Clientes y órdenes', icon: 'groups', roles: ['admin'] }],
    },
    {
      label: 'Sistema',
      items: [{ path: '/admin', label: 'Administración', icon: 'admin_panel_settings', roles: ['admin'] }],
    },
  ];

  ngOnInit(): void {
    // Título inicial: cubre recarga directa / F5 (el subscribe a NavigationEnd
    // se registra después del primer evento de navegación).
    this.applyRouteTitle();

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.applyRouteTitle();
        this.sidebarOpen = false;
      });

    this.loadPendingRefills();
  }

  /** Lee title/sub de la ruta activa más profunda (data de la ruta). */
  private applyRouteTitle(): void {
    let route = this.router.routerState.root;
    while (route.firstChild) {
      route = route.firstChild;
    }
    const data = route.snapshot.data as { title?: string; sub?: string };
    this.pageTitle = data.title ?? '';
    this.pageSub = data.sub ?? '';
  }

  /**
   * Badge de reposiciones: cuenta productos con stock bajo su mínimo
   * (punto de reposición) desde el endpoint de productos activos.
   */
  private loadPendingRefills(): void {
    this.productsApi.getActiveProducts().subscribe({
      next: (products) => {
        this.pendingRefills = (products ?? []).filter(
          (p) => (p.stock ?? 0) < (p.minimum ?? 0),
        ).length;
      },
      error: () => {
        this.pendingRefills = 0;
      },
    });
  }

  badgeFor(item: NavItem): number | undefined {
    if (item.badgeKey !== 'refills' || this.pendingRefills <= 0) {
      return undefined;
    }
    return this.pendingRefills;
  }

  get user(): UserProfile | undefined {
    return this.authService.getCurrentUser() ?? undefined;
  }

  get roleLabel(): string {
    switch (this.user?.role) {
      case 'admin': return 'Administrador';
      case 'warehouse': return 'Bodega';
      case 'seller': return 'Vendedor';
      default: return '';
    }
  }

  get initials(): string {
    const name = this.user?.name ?? '';
    const parts = name.trim().split(/\s+/);
    return (parts[0]?.charAt(0) ?? '').toUpperCase();
  }

  /** Nombre corto para el chip: "Alejandro M." (prototipo). */
  get displayName(): string {
    const name = this.user?.name ?? '';
    const parts = name.trim().split(/\s+/);
    if (parts.length <= 1) return name;
    const lastNameInitial = parts[parts.length - 1].charAt(0);
    return `${parts[0]} ${lastNameInitial}.`;
  }

  visibleItems(group: NavGroup): NavItem[] {
    return group.items.filter((item) => item.roles.includes(this.user?.role ?? ''));
  }

  hasVisibleItems(group: NavGroup): boolean {
    return this.visibleItems(group).length > 0;
  }

  /** Global search: navigate to the screen whose label matches the query. */
  runGlobalSearch(): void {
    const q = this.globalSearch.trim().toLowerCase();
    if (!q) return;
    const allItems = this.navGroups.flatMap((g) => g.items);
    const match = allItems.find((item) => item.label.toLowerCase().includes(q));
    if (match) {
      this.router.navigate([match.path]);
    }
    this.globalSearch = '';
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}