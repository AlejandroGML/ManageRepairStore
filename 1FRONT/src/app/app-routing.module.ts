import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { rolesGuard } from './guards/roles.guard';
import { homeRedirectGuard } from './guards/home-redirect.guard';
import { ShellComponent } from './components/shared/shell/shell.component';
import { PanelComponent } from './components/shared/panel/panel.component';
import { LoginComponent } from './components/shared/login/login.component';
import { SalesComponent } from './components/sales/sales/sales.component';
import { RegisterComponent } from './components/client/register/register.component';
import { FinderComponent } from './components/client/finder/finder.component';
import { BodegaComponent } from './components/warehouse/bodega/bodega.component';
import { ProductComponent } from './components/product/product/product.component';
import { RefillsComponent } from './components/product/refills/refills.component';
import { UserManagementComponent } from './components/admin/user-management/user-management.component';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [homeRedirectGuard],
  },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        canActivate: [homeRedirectGuard],
        component: PanelComponent,
      },
      {
        path: 'panel',
        component: PanelComponent,
        data: { title: 'Panel', sub: 'Resumen del taller' },
      },
      {
        path: 'ventas',
        component: SalesComponent,
        canActivate: [rolesGuard(['admin', 'seller'])],
        data: { title: 'Punto de venta', sub: 'Busca productos y agrégalos al carrito' },
      },
      {
        path: 'registrar',
        component: RegisterComponent,
        canActivate: [rolesGuard(['admin'])],
        data: { title: 'Orden de ingreso', sub: 'Registra cliente y genera la orden de servicio' },
      },
      {
        path: 'bodega',
        component: BodegaComponent,
        canActivate: [rolesGuard(['admin', 'warehouse'])],
        data: { title: 'Bodega', sub: 'Inventario y reposiciones' },
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'inventario' },
          {
            path: 'inventario',
            component: ProductComponent,
            data: { title: 'Inventario', sub: 'Catálogo de productos' },
          },
          {
            path: 'reposiciones',
            component: RefillsComponent,
            data: { title: 'Reposiciones', sub: 'Registra entradas de inventario' },
          },
        ],
      },
      {
        path: 'productos',
        redirectTo: 'bodega/inventario',
      },
      {
        path: 'reposiciones',
        redirectTo: 'bodega/reposiciones',
      },
      {
        path: 'clientes',
        component: FinderComponent,
        canActivate: [rolesGuard(['admin'])],
        data: { title: 'Clientes y órdenes', sub: '8 clientes · 36 órdenes' },
      },
      {
        path: 'admin',
        component: UserManagementComponent,
        canActivate: [rolesGuard(['admin'])],
        data: { title: 'Administración', sub: 'Usuarios y roles del sistema' },
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
