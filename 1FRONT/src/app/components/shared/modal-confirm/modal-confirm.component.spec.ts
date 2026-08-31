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
});
