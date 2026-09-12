import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { ModalConfirmComponent } from './modal-confirm.component';

describe('ModalConfirmComponent', () => {
  let component: ModalConfirmComponent;
  let fixture: ComponentFixture<ModalConfirmComponent>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<ModalConfirmComponent>>;

  beforeEach(async () => {
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [ModalConfirmComponent, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: { message: 'Cliente eliminado exitosamente' } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ModalConfirmComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render data.message in the template', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Cliente eliminado exitosamente');
  });

  it('should render a custom message when passed different data', () => {
    // Re-create with different message
    const altDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [ModalConfirmComponent, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: altDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { message: 'Producto agregado correctamente!' } },
      ],
    }).compileComponents();

    const altFixture = TestBed.createComponent(ModalConfirmComponent);
    altFixture.detectChanges();
    const compiled = altFixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Producto agregado correctamente!');
  });

  it('should handle empty message without throwing', () => {
    const emptyDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [ModalConfirmComponent, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: emptyDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { message: '' } },
      ],
    }).compileComponents();

    expect(() => {
      const emptyFixture = TestBed.createComponent(ModalConfirmComponent);
      emptyFixture.detectChanges();
    }).not.toThrow();
  });

  it('should call dialogRef.close() when close() is invoked', () => {
    component.close();
    expect(dialogRefSpy.close).toHaveBeenCalled();
  });

  it('should call dialogRef.close(true) when confirm() is invoked', () => {
    component.confirm();
    expect(dialogRefSpy.close).toHaveBeenCalledWith(true);
  });

  it('should default to confirm mode with Cancelar + Confirmar buttons', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(component.mode).toBe('confirm');
    expect(compiled.textContent).toContain('Cancelar');
    expect(compiled.textContent).toContain('Confirmar');
  });

  describe('notify mode', () => {
    function buildNotify(data: Partial<{ message: string; okLabel: string; title: string }>) {
      const notifyRef = jasmine.createSpyObj('MatDialogRef', ['close']);
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [ModalConfirmComponent, NoopAnimationsModule],
        providers: [
          { provide: MatDialogRef, useValue: notifyRef },
          { provide: MAT_DIALOG_DATA, useValue: { message: 'Listo', mode: 'notify', ...data } },
        ],
      }).compileComponents();
      const f = TestBed.createComponent(ModalConfirmComponent);
      f.detectChanges();
      return { f, compiled: f.nativeElement as HTMLElement };
    }

    it('should render a single Aceptar button and no cancel/close affordances', () => {
      const { compiled } = buildNotify({});
      expect(compiled.textContent).toContain('Aceptar');
      expect(compiled.textContent).not.toContain('Cancelar');
      expect(compiled.textContent).not.toContain('Confirmar');
    });

    it('should use a custom okLabel and title when provided', () => {
      const { compiled } = buildNotify({ okLabel: 'Entendido', title: 'Hecho' });
      expect(compiled.textContent).toContain('Entendido');
      expect(compiled.textContent).toContain('Hecho');
    });
  });

  it('should support custom okLabel in confirm mode', () => {
    const customRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [ModalConfirmComponent, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: customRef },
        { provide: MAT_DIALOG_DATA, useValue: { message: '¿Seguro?', okLabel: 'Eliminar' } },
      ],
    }).compileComponents();
    const customFixture = TestBed.createComponent(ModalConfirmComponent);
    customFixture.detectChanges();
    expect(customFixture.nativeElement.textContent).toContain('Eliminar');
    expect(customFixture.componentInstance.okLabel).toBe('Eliminar');
  });
});
