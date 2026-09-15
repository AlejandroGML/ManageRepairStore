import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../../services/auth.service';
import { ProductsApiService } from '../../../services/products.api.service';
import { UserProfile } from '../../../interface/user-profile';
import { ThemeToggleComponent } from '../theme-toggle/theme-toggle.component';
import { I18nService, Lang } from '../../../i18n/i18n.service';
import { TPipe } from '../../../i18n/t.pipe';

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
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatTooltipModule,
    ThemeToggleComponent,
    TPipe,
  ],
})
export class ShellComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly productsApi = inject(ProductsApiService);
  readonly i18n = inject(I18nService);

  sidebarOpen = false;
  sidebarCollapsed = false;
  pageTitle = '';
  pageSub = '';
  pendingRefills = 0;

  readonly navGroups: NavGroup[] = [
    {
      label: 'nav.group.main',
      items: [
        { path: '/panel', label: 'nav.panel', icon: 'dashboard', roles: ['admin', 'warehouse', 'seller'] },
        { path: '/ventas', label: 'nav.sales', icon: 'point_of_sale', roles: ['admin', 'seller'] },
        { path: '/registrar', label: 'nav.registerOrder', icon: 'assignment_add', roles: ['admin'] },
      ],
    },
    {
      label: 'nav.group.inventory',
      items: [
        { path: '/bodega', label: 'nav.warehouse', icon: 'warehouse', roles: ['admin', 'warehouse'], badgeKey: 'refills' },
      ],
    },
    {
      label: 'nav.group.management',
      items: [
        { path: '/clientes', label: 'nav.clients', icon: 'groups', roles: ['admin'] },
      ],
    },
    {
      label: 'nav.group.system',
      items: [
        { path: '/admin', label: 'nav.admin', icon: 'admin_panel_settings', roles: ['admin'] },
      ],
    },
  ];

  ngOnInit(): void {
    // Initial title: covers direct load / F5 (the NavigationEnd subscription
    // below is registered only after the first navigation event).
    this.applyRouteTitle();

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.applyRouteTitle();
        this.sidebarOpen = false;
      });

    this.loadPendingRefills();
  }

  /**
   * Reads title/sub from the deepest active route (declared in route data).
   * Snapshot read in ngOnInit + NavigationEnd subscription for client-side
   * navigation (MRS lesson #3: empty topbar title on F5).
   */
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
   * Refills badge: counts products whose stock is below their minimum
   * (reorder threshold). Placeholder computed from the existing products
   * endpoint until a dedicated "pending refills" endpoint exists.
   */
  private loadPendingRefills(): void {
    this.productsApi.getActiveProducts().subscribe({
      next: (products) => {
        this.pendingRefills = (products ?? []).filter(
          (p) => (p.stock ?? 0) < (p.minimum ?? 0)
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

  /** i18n key — resolved with the `t` pipe so it follows the live language. */
  get roleLabel(): string {
    switch (this.user?.role) {
      case 'admin':
        return 'role.admin';
      case 'warehouse':
        return 'role.warehouse';
      case 'seller':
        return 'role.seller';
      default:
        return '';
    }
  }

  toggleLang(): void {
    this.i18n.toggle();
  }

  get langLabel(): string {
    return this.i18n.lang() === 'en' ? 'ES' : 'EN';
  }

  get initials(): string {
    const name = this.user?.name ?? '';
    const parts = name.trim().split(/\s+/);
    return (parts[0]?.charAt(0) ?? '').toUpperCase();
  }

  /** Short display name for the user chip: "Alejandro M." */
  get displayName(): string {
    const name = this.user?.name ?? '';
    const parts = name.trim().split(/\s+/);
    if (parts.length <= 1) return name;
    const lastNameInitial = parts[parts.length - 1].charAt(0);
    return `${parts[0]} ${lastNameInitial}.`;
  }

  visibleItems(group: NavGroup): NavItem[] {
    return group.items.filter((item) =>
      item.roles.includes(this.user?.role ?? '')
    );
  }

  hasVisibleItems(group: NavGroup): boolean {
    return this.visibleItems(group).length > 0;
  }

  logout(): void {
    this.authService.logout();
  }

  goProfile(): void {
    this.router.navigate(['/perfil']);
  }
}
