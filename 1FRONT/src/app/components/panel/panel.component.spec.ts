import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule } from '@angular/router';
import { of } from 'rxjs';
import { PanelComponent } from './panel.component';
import { ProductsApiService } from '../../services/products.api.service';
import { OrdersApiService } from '../../services/orders.api.service';
import { LogApiService } from '../../services/log.api.service';
import { SalesApiService } from '../../services/sales.api.service';
import { SnackbarService } from '../../services/snackbar.service';
import { AuthService } from '../../services/auth.service';
import { Product } from '../../interface/warehouse';

/**
 * WCAG contrast ratio between two CSS rgb() colors.
 * Expected pair: $color-accent #059669 on $color-on-primary #FFFFFF ≈ 3.0:1
 * (meets the ~3:1 UI-component/large-text threshold; the exact token pair is
 * the accepted design decision from the MRS port).
 */
function contrastRatio(bg: string, fg: string): number {
  const parse = (s: string): number[] => (s.match(/[\d.]+/g) || []).map(Number).slice(0, 3);
  const lum = (rgb: number[]): number => {
    const f = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
    const [r, g, b] = rgb.map((v) => v / 255).map(f);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [l1, l2] = [lum(parse(bg)), lum(parse(fg))].sort((a, b) => b - a);
  return (l1 + 0.05) / (l2 + 0.05);
}

describe('PanelComponent', () => {
  let component: PanelComponent;
  let fixture: ComponentFixture<PanelComponent>;
  let productsSpy: jasmine.SpyObj<ProductsApiService>;
  let ordersSpy: jasmine.SpyObj<OrdersApiService>;
  let logSpy: jasmine.SpyObj<LogApiService>;
  let salesSpy: jasmine.SpyObj<SalesApiService>;
  let snackbarSpy: jasmine.SpyObj<SnackbarService>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  const products: Product[] = [
    { id: 1, name: 'Aceite 10W40', quantity: 0, stock: 2, minimum: 5, transactions: [], category: { id: 1, name: 'Lubricantes' } as any },
    { id: 2, name: 'Filtro aire', quantity: 0, stock: 12, minimum: 5, transactions: [], category: { id: 2, name: 'Filtros' } as any },
    { id: 3, name: 'Bujía', quantity: 0, stock: 0, minimum: 0, transactions: [], category: null as any },
    { id: 4, name: 'Amortiguador', quantity: 0, stock: 8, minimum: 10, transactions: [], category: { id: 1, name: 'Lubricantes' } as any },
  ];

  const clientsWithOrders = [
    {
      id: 1, name: 'Cliente A', rut_raw: '11111111-1', address: '', city: '', phone: '',
      orders: [
        { id: 1, description: '', observation: '', date: new Date(), status: 'Pendiente' },
        { id: 2, description: '', observation: '', date: new Date(), status: 'En reparacion' },
      ],
    },
    {
      id: 2, name: 'Cliente B', rut_raw: '22222222-2', address: '', city: '', phone: '',
      orders: [{ id: 3, description: '', observation: '', date: new Date(), status: 'Entregado' }],
    },
  ];

  beforeEach(async () => {
    productsSpy = jasmine.createSpyObj('ProductsApiService', ['getActiveProducts']);
    ordersSpy = jasmine.createSpyObj('OrdersApiService', ['getAllOrders']);
    logSpy = jasmine.createSpyObj('LogApiService', ['getData']);
    salesSpy = jasmine.createSpyObj('SalesApiService', ['getTodaySummary']);
    snackbarSpy = jasmine.createSpyObj('SnackbarService', ['openSnackBar']);
    authServiceSpy = jasmine.createSpyObj('AuthService', ['getCurrentUser']);
    authServiceSpy.getCurrentUser.and.returnValue(null);

    productsSpy.getActiveProducts.and.returnValue(of(products));
    ordersSpy.getAllOrders.and.returnValue(of(clientsWithOrders));
    logSpy.getData.and.returnValue(of([] as any));
    salesSpy.getTodaySummary.and.returnValue(of({ total: 45000, count: 3 }));

    await TestBed.configureTestingModule({
      imports: [PanelComponent, NoopAnimationsModule, RouterModule.forRoot([])],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ProductsApiService, useValue: productsSpy },
        { provide: OrdersApiService, useValue: ordersSpy },
        { provide: LogApiService, useValue: logSpy },
        { provide: SalesApiService, useValue: salesSpy },
        { provide: SnackbarService, useValue: snackbarSpy },
        { provide: AuthService, useValue: authServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the CTA with the violet accent token and readable on-primary text', () => {
    const btn = fixture.nativeElement.querySelector('.btn-accent') as HTMLElement;
    expect(btn).toBeTruthy();
    const cs = getComputedStyle(btn);
    expect(cs.backgroundColor).toBe('rgb(5, 150, 105)'); // $color-accent #059669
    expect(cs.color).toBe('rgb(255, 255, 255)');          // $color-on-primary
    expect(contrastRatio(cs.backgroundColor, cs.color)).toBeGreaterThanOrEqual(2.9);
  });

  it('should load the 4 KPI cards with correct values', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(component.kpis.length).toBe(4);
    expect(compiled.textContent).toContain('Ventas de hoy');
    expect(compiled.textContent).toContain('$45.000');
    expect(compiled.textContent).toContain('Órdenes abiertas');
    expect(compiled.textContent).toContain('Stock bajo');
    expect(compiled.textContent).toContain('Catálogo');
    expect(component.loading).toBeFalse();
  });

  it('should bind each KPI to its own sub (MRS lesson #7 — no crossed bindings)', () => {
    const kpis = component.kpis;
    const ventas = kpis.find((k) => k.label === 'Ventas de hoy');
    const ordenes = kpis.find((k) => k.label === 'Órdenes abiertas');
    const stock = kpis.find((k) => k.label === 'Stock bajo');
    const catalogo = kpis.find((k) => k.label === 'Catálogo');

    expect(ventas?.deltaText).toBe('3 ventas');
    expect(ordenes?.value).toBe('2'); // Pendiente + En reparacion
    expect(ordenes?.deltaText).toBe('3 órdenes totales');
    expect(stock?.value).toBe('2'); // Aceite (2<5) + Amortiguador (8<10)
    expect(stock?.deltaText).toBe('2 críticos'); // stock <= 2: Aceite (2) + Bujía (0)
    expect(catalogo?.value).toBe('4');
    expect(catalogo?.deltaText).toBe('2 categorías');
    // El catálogo NO debe decir "clientes registrados"
    expect(catalogo?.deltaText).not.toContain('clientes');
  });

  it('should list low-stock products with their MÍNIMO value', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(component.lowStock.length).toBe(2);
    expect(compiled.textContent).toContain('Aceite 10W40');
    expect(compiled.textContent).toContain('Mínimo');
    // El mínimo 5 debe estar visible para el producto con stock 2
    const row = (compiled.querySelector('tbody tr') as HTMLElement);
    expect(row?.textContent).toContain('5');
  });

  it('should NOT flag products with minimum 0 as low stock', () => {
    const names = component.lowStock.map((p) => p.name);
    expect(names).not.toContain('Bujía');
  });

  it('should show empty state when no low-stock products exist', () => {
    productsSpy.getActiveProducts.and.returnValue(of([
      { id: 1, name: 'Sano', quantity: 0, stock: 10, minimum: 5, transactions: [] },
    ]));
    component.ngOnInit();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(component.lowStock.length).toBe(0);
    expect(compiled.textContent).toContain('Sin alertas');
  });

  it('should render the activity feed with title, description and right-aligned time', () => {
    logSpy.getData.and.returnValue(of([
      { userName: 'Admin', clientId: 1, clientName: 'Cliente A', action: 'Venta registrada', date: new Date() },
    ] as any));
    component.ngOnInit();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Venta registrada');
    expect(compiled.textContent).toContain('Cliente A');
    expect(compiled.textContent).toContain('por Admin');
    expect(compiled.querySelector('.activity-time')).toBeTruthy();
  });

  it('should show the Nueva orden button only for admin users', () => {
    // Sin usuario autenticado: oculto
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Nueva orden');

    // Admin: visible
    authServiceSpy.getCurrentUser.and.returnValue({
      id: 1, name: 'Admin', email: 'a@b.cl', role: 'admin',
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Nueva orden');
  });

  it('should show empty state when there is no activity', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Sin actividad registrada');
  });

  it('should show sales KPI 0 when no sales today (no error, no spinner)', () => {
    salesSpy.getTodaySummary.and.returnValue(of({ total: 0, count: 0 }));
    component.ngOnInit();
    fixture.detectChanges();
    const kpi = component.kpis.find((k) => k.label === 'Ventas de hoy');
    expect(kpi?.value).toBe('$0');
    expect(component.loading).toBeFalse();
  });

  it('should warn instead of exporting an empty XLSX when there is no low stock', () => {
    // Todos los productos con minimum 0 → lowStock vacío
    productsSpy.getActiveProducts.and.returnValue(of([
      { id: 1, name: 'A', stock: 5, minimum: 0 } as unknown as Product,
    ]));
    component.ngOnInit();
    fixture.detectChanges();
    component.exportLowStock();
    expect(snackbarSpy.openSnackBar).toHaveBeenCalledWith(
      'Sin alertas de stock bajo para exportar'
    );
  });
});
