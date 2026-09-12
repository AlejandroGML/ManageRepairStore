import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { of } from 'rxjs';

import { ModalOrderDetailComponent } from './modal-order-detail.component';
import { ModalStatusComponent } from '../../shared/modal-status/modal-status.component';
import { Client, Order } from 'src/app/interface/client';

describe('ModalOrderDetailComponent', () => {
  let component: ModalOrderDetailComponent;
  let fixture: ComponentFixture<ModalOrderDetailComponent>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;

  const client: Client = {
    id: 7,
    name: 'cliente prueba',
    rut_raw: '11111111-1',
    phone: '9 5555 0000',
    address: 'Av. Central 10',
    city: 'Viña del Mar',
  } as Client;

  const order: Order = {
    id: 42,
    code: 'ORD-1080',
    description: 'Cocina a gas no enciende',
    observation: 'Piloto dañado',
    date: new Date('2026-09-01T10:00:00'),
    status: 'Pendiente',
    comment: '',
  };

  beforeEach(async () => {
    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);

    await TestBed.configureTestingModule({
      imports: [ModalOrderDetailComponent, NoopAnimationsModule, MatDialogModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { client, order } },
        { provide: MatDialog, useValue: dialogSpy },
        { provide: MatDialogRef, useValue: { close: jasmine.createSpy('close') } },
      ],
    }).compileComponents();

    // MatDialogModule provides MatDialog at module level (Material 21),
    // shadowing the root TestBed provider — override at component level.
    TestBed.overrideComponent(ModalOrderDetailComponent, {
      set: { providers: [{ provide: MatDialog, useValue: dialogSpy }] },
    });

    fixture = TestBed.createComponent(ModalOrderDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should show client and order data', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Cliente prueba');
    expect(compiled.textContent).toContain('ORD-1080');
    expect(compiled.textContent).toContain('Cocina a gas no enciende');
    expect(compiled.textContent).toContain('Pendiente');
  });

  it('should label "En reparacion" with accent', () => {
    expect(component.statusLabel('En reparacion')).toBe('En reparación');
  });

  it('should open the status modal and mark changed on result', () => {
    const updated = { ...order, status: 'Entregado', comment: 'listo' };
    dialogSpy.open.and.returnValue({ afterClosed: () => of(updated) } as any);

    component.changeStatus();

    expect(dialogSpy.open).toHaveBeenCalledWith(
      ModalStatusComponent,
      jasmine.objectContaining({ maxWidth: '560px' })
    );
    expect(component.order.status).toBe('Entregado');
    expect(component.changed).toBeTrue();
  });

  it('should close with the changed flag', () => {
    const closeSpy = jasmine.createSpy('close');
    (component as any).dialogRef = { close: closeSpy };
    component.changed = true;
    component.close();
    expect(closeSpy).toHaveBeenCalledWith({ changed: true });
  });
});
