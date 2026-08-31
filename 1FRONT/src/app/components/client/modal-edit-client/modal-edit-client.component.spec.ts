import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';

import { ModalEditClientComponent } from './modal-edit-client.component';
import { ClientsApiService } from 'src/app/services/clients.api.service';
import { SnackbarService } from 'src/app/services/snackbar.service';
import { LoadingService } from 'src/app/services/loading.service';
import { Client } from 'src/app/interface/client';

describe('ModalEditClientComponent', () => {
  let component: ModalEditClientComponent;
  let fixture: ComponentFixture<ModalEditClientComponent>;
  let clientsApiSpy: jasmine.SpyObj<ClientsApiService>;
  let snackbarSpy: jasmine.SpyObj<SnackbarService>;
  let loadingSpy: jasmine.SpyObj<LoadingService>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<ModalEditClientComponent>>;

  const mockClient: Client = {
    id: 1,
    name: 'Test Client',
    rut_raw: '12345678-5',
    address: 'Test Address',
    city: 'Test City',
    phone: '123456789',
    code: 32086,
    email: 'test@test.cl',
    active: true,
    company_name: 'Empresa Centro',
  };

  beforeEach(async () => {
    clientsApiSpy = jasmine.createSpyObj('ClientsApiService', ['updateUser']);
    snackbarSpy = jasmine.createSpyObj('SnackbarService', ['openSnackBar']);
    loadingSpy = jasmine.createSpyObj('LoadingService', ['setLoading']);
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [ModalEditClientComponent, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: mockClient },
        { provide: ClientsApiService, useValue: clientsApiSpy },
        { provide: SnackbarService, useValue: snackbarSpy },
        { provide: LoadingService, useValue: loadingSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ModalEditClientComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should pre-fill form from injected data', () => {
    expect(component.form.get('name')?.value).toBe('Test Client');
    expect(component.form.get('rut')?.value).toBe('12345678-5');
    expect(component.form.get('address')?.value).toBe('Test Address');
    expect(component.form.get('city')?.value).toBe('Test City');
    expect(component.form.get('phone')?.value).toBe('123456789');
    expect(component.form.get('email')?.value).toBe('test@test.cl');
    expect(component.form.get('id')?.value).toBe(1);
  });

  it('should send code: this.data.code on save (NOT code: 0)', fakeAsync(() => {
    clientsApiSpy.updateUser.and.returnValue(of(mockClient));

    component.saveClient();
    tick();

    const updateArg = clientsApiSpy.updateUser.calls.mostRecent().args[0];
    expect(updateArg.code).toBe(32086);
    expect(updateArg.code).not.toBe(0);
  }));

  it('should not call saveClient() when form is invalid', () => {
    clientsApiSpy.updateUser.and.returnValue(of(mockClient));
    component.form.get('name')?.setValue(''); // Make form invalid

    component.saveClient();

    expect(clientsApiSpy.updateUser).not.toHaveBeenCalled();
  });

  it('should show snackbar and close with null on update error', fakeAsync(() => {
    clientsApiSpy.updateUser.and.returnValue(throwError(() => new Error('Update failed')));

    component.saveClient();
    tick();

    expect(snackbarSpy.openSnackBar).toHaveBeenCalledWith('Error al actualizar. Intente nuevamente.');
    expect(loadingSpy.setLoading).toHaveBeenCalledWith(false);
    expect(dialogRefSpy.close).toHaveBeenCalledWith(null);
  }));

  it('should call dialogRef.close(null) when close() is invoked', () => {
    component.close();
    expect(dialogRefSpy.close).toHaveBeenCalledWith(null);
  });

  it('should pre-fill company_name from injected data', () => {
    expect(component.form.get('company_name')?.value).toBe('Empresa Centro');
  });

  it('should include company_name in update payload on save', fakeAsync(() => {
    clientsApiSpy.updateUser.and.returnValue(of(mockClient));

    component.form.get('company_name')?.setValue('Sucursal Norte');
    component.saveClient();
    tick();

    const updateArg = clientsApiSpy.updateUser.calls.mostRecent().args[0];
    expect(updateArg.company_name).toBe('Sucursal Norte');
  }));
});
