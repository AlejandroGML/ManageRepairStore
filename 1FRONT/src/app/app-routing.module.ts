import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { rolesGuard } from './guards/roles.guard';
import { homeRedirectGuard } from './guards/home-redirect.guard';
import { ShellComponent } from './components/shared/shell/shell.component';
import { PanelComponent } from './components/panel/panel.component';
import { LoginComponent } from './components/shared/login/login.component';
import { ProfileComponent } from './components/shared/profile/profile.component';
import { SalesComponent } from './components/sales/sales/sales.component';
import { RegisterComponent } from './components/client/register/register.component';
import { FinderComponent } from './components/client/finder/finder.component';
import { BodegaComponent } from './components/warehouse/bodega/bodega.component';
import { ProductComponent } from './components/product/product/product.component';
import { RefillsComponent } from './components/product/refills/refills.component';
import { RepuestosComponent } from './components/product/repuestos/repuestos.component';
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
        data: { title: 'routes.panel', sub: 'routes.panelSub' },
      },
      {
        path: 'perfil',
        component: ProfileComponent,
        data: { title: 'routes.profile', sub: 'routes.profileSub' },
      },
      {
        path: 'ventas',
        component: SalesComponent,
        canActivate: [rolesGuard(['admin', 'seller'])],
        data: { title: 'routes.sales', sub: 'routes.salesSub' },
      },
      {
        path: 'registrar',
        component: RegisterComponent,
        canActivate: [rolesGuard(['admin'])],
        data: { title: 'routes.register', sub: 'routes.registerSub' },
      },
      {
        path: 'bodega',
        component: BodegaComponent,
        canActivate: [rolesGuard(['admin', 'warehouse'])],
        data: { title: 'routes.warehouse', sub: 'routes.warehouseSub' },
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'inventario' },
          {
            path: 'inventario',
            component: ProductComponent,
            data: { title: 'routes.inventory', sub: 'routes.inventorySub' },
          },
          {
            path: 'reposiciones',
            component: RefillsComponent,
            data: { title: 'routes.restocks', sub: 'routes.restocksSub' },
          },
          {
            path: 'repuestos',
            component: RepuestosComponent,
            data: { title: 'routes.parts', sub: 'routes.partsSub' },
          },
        ],
      },
      {
        path: 'clientes',
        component: FinderComponent,
        canActivate: [rolesGuard(['admin'])],
        data: { title: 'routes.clients', sub: 'routes.clientsSub' },
      },
      {
        path: 'admin',
        component: UserManagementComponent,
        canActivate: [rolesGuard(['admin'])],
        data: { title: 'routes.admin', sub: 'routes.adminSub' },
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
