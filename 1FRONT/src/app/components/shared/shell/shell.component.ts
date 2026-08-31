import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from 'src/app/services/auth.service';
import { UserProfile } from 'src/app/interface/user-profile';
import { ThemeToggleComponent } from '../theme-toggle/theme-toggle.component';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  roles: string[];
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
  imports: [CommonModule, RouterModule, MatIconModule, MatTooltipModule, ThemeToggleComponent],
})
export class ShellComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  sidebarOpen = false;
  pageTitle = '';
  pageSub = '';

  readonly navGroups: NavGroup[] = [
    {
      label: 'Principal',
      items: [{ path: '/panel', label: 'Panel', icon: 'dashboard', roles: ['admin', 'warehouse', 'seller'] }],
    },
    {
      label: 'Inventario',
      items: [
        { path: '/productos', label: 'Productos', icon: 'inventory_2', roles: ['admin', 'warehouse'] },
        { path: '/bodega', label: 'Bodega', icon: 'warehouse', roles: ['admin', 'warehouse'] },
        { path: '/reposiciones', label: 'Reposiciones', icon: 'add_box', roles: ['admin', 'warehouse'] },
      ],
    },
    {
      label: 'Gestión',
      items: [
        { path: '/ventas', label: 'Ventas', icon: 'point_of_sale', roles: ['admin', 'seller'] },
        { path: '/registrar', label: 'Registrar Orden', icon: 'note_add', roles: ['admin'] },
        { path: '/clientes', label: 'Clientes y Órdenes', icon: 'groups', roles: ['admin'] },
      ],
    },
    {
      label: 'Sistema',
      items: [{ path: '/admin', label: 'Administración', icon: 'admin_panel_settings', roles: ['admin'] }],
    },
  ];

  ngOnInit(): void {
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      let route = this.router.routerState.root;
      while (route.firstChild) {
        route = route.firstChild;
      }
      const data = route.snapshot.data as { title?: string; sub?: string };
      this.pageTitle = data.title ?? '';
      this.pageSub = data.sub ?? '';
      this.sidebarOpen = false;
    });
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
    const first = parts[0]?.charAt(0) ?? '';
    const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
    return (first + last).toUpperCase();
  }

  visibleItems(group: NavGroup): NavItem[] {
    return group.items.filter((item) => item.roles.includes(this.user?.role ?? ''));
  }

  hasVisibleItems(group: NavGroup): boolean {
    return this.visibleItems(group).length > 0;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}