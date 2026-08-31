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
import { WarehouseComponent } from './components/warehouse/warehouse/warehouse.component';
import { ProductComponent } from './components/product/product/product.component';
import { RefillsComponent } from './components/product/refills/refills.component';
import { UserManagementComponent } from './components/admin/user-management/user-management.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', canActivate: [homeRedirectGuard], component: PanelComponent },
      { path: 'panel', component: PanelComponent, data: { title: 'Panel', sub: 'Resumen del negocio' } },
      { path: 'ventas', component: SalesComponent, canActivate: [rolesGuard(['admin', 'seller'])], data: { title: 'Ventas', sub: 'Punto de venta' } },
      { path: 'registrar', component: RegisterComponent, canActivate: [rolesGuard(['admin'])], data: { title: 'Registrar Orden', sub: 'Orden de ingreso' } },
      { path: 'productos', component: ProductComponent, canActivate: [rolesGuard(['admin', 'warehouse'])], data: { title: 'Productos', sub: 'Inventario y stock' } },
      { path: 'bodega', component: WarehouseComponent, canActivate: [rolesGuard(['admin', 'warehouse'])], data: { title: 'Bodega', sub: 'Stock por ubicación' } },
      { path: 'reposiciones', component: RefillsComponent, canActivate: [rolesGuard(['admin', 'warehouse'])], data: { title: 'Reposiciones', sub: 'Entradas de mercadería' } },
      { path: 'clientes', component: FinderComponent, canActivate: [rolesGuard(['admin'])], data: { title: 'Clientes y Órdenes', sub: 'Registro de clientes' } },
      { path: 'admin', component: UserManagementComponent, canActivate: [rolesGuard(['admin'])], data: { title: 'Administración', sub: 'Gestión de usuarios' } },
    ],
  },
  { path: '**', redirectTo: '' },
];