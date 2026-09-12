import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { provideRouter, Router, Routes } from '@angular/router';
import { of } from 'rxjs';
import { ShellComponent } from './shell.component';
import { AuthService } from '../../../services/auth.service';
import { ProductsApiService } from '../../../services/products.api.service';
import { authGuard } from '../../../guards/auth.guard';
import { homeRedirectGuard } from '../../../guards/home-redirect.guard';

@Component({ template: '<p>ventas screen</p>', standalone: true })
class DummyVentas {}

@Component({ template: '<p>panel screen</p>', standalone: true })
class DummyPanel {}

@Component({ template: '<p>inventory screen</p>', standalone: true })
class DummyInventory {}

const testRoutes: Routes = [
  { path: 'login', component: DummyVentas },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        canActivate: [homeRedirectGuard],
        component: DummyPanel,
      },
      {
        path: 'panel',
        component: DummyPanel,
        data: { title: 'Panel', sub: 'Resumen del negocio' },
      },
      {
        path: 'ventas',
        component: DummyVentas,
        data: { title: 'Punto de venta', sub: 'Busca productos y agrégalos al carrito' },
      },
      {
        path: 'bodega',
        component: DummyInventory,
        data: { title: 'Bodega', sub: 'Ubicaciones y niveles de stock' },
      },
      {
        path: 'productos',
        component: DummyInventory,
        data: { title: 'Productos', sub: 'Catálogo e inventario' },
      },
      {
        path: 'reposiciones',
        component: DummyInventory,
        data: { title: 'Reposiciones', sub: 'Registra entradas de inventario' },
      },
      {
        path: 'admin',
        component: DummyPanel,
        data: { title: 'Administración', sub: 'Usuarios y roles del sistema' },
      },
    ],
  },
];

function setCurrentUser(role: string): void {
  localStorage.setItem(
    'current_user',
    JSON.stringify({ id: 1, name: 'Alejandro Martínez', email: 'test@demo.example', role })
  );
}

const productsOk = [
  { id: 1, name: 'Regulador', stock: 12, minimum: 4, transactions: [] },
  { id: 2, name: 'Manguera', stock: 9, minimum: 3, transactions: [] },
];

const productsLow = [
  { id: 1, name: 'Regulador', stock: 2, minimum: 5, transactions: [] },
  { id: 2, name: 'Manguera', stock: 9, minimum: 3, transactions: [] },
];

describe('ShellComponent', () => {
  let fixture: ComponentFixture<ShellComponent>;
  let component: ShellComponent;
  let router: Router;
  let productsApiMock: jasmine.SpyObj<ProductsApiService>;

  beforeEach(async () => {
    productsApiMock = jasmine.createSpyObj<ProductsApiService>('ProductsApiService', [
      'getActiveProducts',
    ]);
    productsApiMock.getActiveProducts.and.returnValue(of(productsOk as any));

    await TestBed.configureTestingModule({
      imports: [ShellComponent],
      providers: [
        provideRouter(testRoutes),
        AuthService,
        { provide: ProductsApiService, useValue: productsApiMock },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    localStorage.clear();
    localStorage.setItem('access_token', 'test-token');
    setCurrentUser('admin');
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should create the shell', async () => {
    await router.navigate(['/ventas']);
    fixture = TestBed.createComponent(ShellComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should read the active route title/sub in ngOnInit (direct load / F5)', async () => {
    await router.navigate(['/ventas']);
    fixture = TestBed.createComponent(ShellComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.pageTitle).toBe('Punto de venta');
    expect(component.pageSub).toBe('Busca productos y agrégalos al carrito');

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.topbar-title')?.textContent?.trim()).toBe('Punto de venta');
    expect(compiled.querySelector('.topbar-sub')?.textContent?.trim()).toBe(
      'Busca productos y agrégalos al carrito'
    );
  });

  it('should update the title on client-side navigation (NavigationEnd)', async () => {
    await router.navigate(['/ventas']);
    fixture = TestBed.createComponent(ShellComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    await router.navigate(['/panel']);
    fixture.detectChanges();

    expect(component.pageTitle).toBe('Panel');
    expect(component.pageSub).toBe('Resumen del negocio');
  });

  it('should hide ventas and admin sidebar items for a warehouse user', async () => {
    setCurrentUser('warehouse');
    await router.navigate(['/bodega']);
    fixture = TestBed.createComponent(ShellComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('a[href="/ventas"]')).toBeNull();
    expect(compiled.querySelector('a[href="/admin"]')).toBeNull();
    expect(compiled.querySelector('a[href="/bodega"]')).not.toBeNull();
    // Bodega unificada: productos y reposiciones ya no son rutas propias.
    expect(compiled.querySelector('a[href="/productos"]')).toBeNull();
    expect(compiled.querySelector('a[href="/reposiciones"]')).toBeNull();
  });

  it('should show ventas for an admin user', async () => {
    await router.navigate(['/ventas']);
    fixture = TestBed.createComponent(ShellComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('a[href="/ventas"]')).not.toBeNull();
    expect(compiled.querySelector('a[href="/admin"]')).not.toBeNull();
  });

  it('should render the Manage Repair Store wordmark with its tagline', async () => {
    await router.navigate(['/ventas']);
    fixture = TestBed.createComponent(ShellComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const logo = compiled.querySelector('.brand-logo') as HTMLImageElement;
    expect(logo).toBeTruthy();
    expect(logo?.getAttribute('alt')).toBe('Manage Repair Store');
  });

  it('should show the refills badge with the count of products below minimum', async () => {
    productsApiMock.getActiveProducts.and.returnValue(of(productsLow as any));
    await router.navigate(['/ventas']);
    fixture = TestBed.createComponent(ShellComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const badge = compiled.querySelector('a[href="/bodega"] .nav-badge');
    expect(badge?.textContent?.trim()).toBe('1');
  });

  it('should hide the refills badge when no product is below minimum', async () => {
    await router.navigate(['/ventas']);
    fixture = TestBed.createComponent(ShellComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('a[href="/bodega"] .nav-badge')).toBeNull();
  });

  it('should call AuthService.logout when the logout button is clicked', async () => {
    await router.navigate(['/ventas']);
    fixture = TestBed.createComponent(ShellComponent);
    fixture.detectChanges();

    const authService = TestBed.inject(AuthService);
    const logoutSpy = spyOn(authService, 'logout');

    const compiled = fixture.nativeElement as HTMLElement;
    const logoutBtn = compiled.querySelector('.logout-btn') as HTMLButtonElement;
    expect(logoutBtn).not.toBeNull();
    logoutBtn.click();
    expect(logoutSpy).toHaveBeenCalled();
  });
});
