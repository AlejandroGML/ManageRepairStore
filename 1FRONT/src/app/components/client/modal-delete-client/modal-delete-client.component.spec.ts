import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';

import { ModalDeleteClientComponent } from './modal-delete-client.component';
import { ClientsApiService } from 'src/app/services/clients.api.service';
import { LogApiService } from 'src/app/services/log.api.service';
import { SnackbarService } from 'src/app/services/snackbar.service';
import { LoadingService } from 'src/app/services/loading.service';
import { AuthService } from 'src/app/services/auth.service';
import { Client } from 'src/app/interface/client';

describe('ModalDeleteClientComponent', () => {
  let component: ModalDeleteClientComponent;
  let fixture: ComponentFixture<ModalDeleteClientComponent>;
  let clientsApiSpy: jasmine.SpyObj<ClientsApiService>;
  let logApiSpy: jasmine.SpyObj<LogApiService>;
  let snackbarSpy: jasmine.SpyObj<SnackbarService>;
  let loadingSpy: jasmine.SpyObj<LoadingService>;
  let authSpy: jasmine.SpyObj<AuthService>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<ModalDeleteClientComponent>>;

  const mockClient: Client = {
    id: 1,
    name: 'Test Client',
    rut_raw: '12345678-5',
    address: 'Test Address',
    city: 'Test City',
    phone: '123456789',
    code: 32086,
  };

  beforeEach(async () => {
    clientsApiSpy = jasmine.createSpyObj('ClientsApiService', ['deleteUserById']);
    logApiSpy = jasmine.createSpyObj('LogApiService', ['create']);
    snackbarSpy = jasmine.createSpyObj('SnackbarService', ['openSnackBar']);
    loadingSpy = jasmine.createSpyObj('LoadingService', ['setLoading']);
    authSpy = jasmine.createSpyObj('AuthService', ['getCurrentUser']);
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    authSpy.getCurrentUser.and.returnValue({ name: 'Admin', email: 'admin@demo.example', role: 'admin' } as any);
    logApiSpy.create.and.returnValue(of({} as any));

    await TestBed.configureTestingModule({
      imports: [ModalDeleteClientComponent, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: mockClient },
        { provide: ClientsApiService, useValue: clientsApiSpy },
        { provide: LogApiService, useValue: logApiSpy },
        { provide: SnackbarService, useValue: snackbarSpy },
        { provide: LoadingService, useValue: loadingSpy },
        { provide: AuthService, useValue: authSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ModalDeleteClientComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call deleteUserById and close with id on success', fakeAsync(() => {
    clientsApiSpy.deleteUserById.and.returnValue(of({} as any));

    component.deleteClient();
    tick(200);

    expect(clientsApiSpy.deleteUserById).toHaveBeenCalledWith(1);
    expect(loadingSpy.setLoading).toHaveBeenCalledWith(false);
    expect(dialogRefSpy.close).toHaveBeenCalledWith(1);
  }));

  it('should show snackbar and close with null on delete error', fakeAsync(() => {
    clientsApiSpy.deleteUserById.and.returnValue(throwError(() => new Error('Delete failed')));

    component.deleteClient();
    tick(200);

    expect(snackbarSpy.openSnackBar).toHaveBeenCalledWith('Error al eliminar. Intente nuevamente.');
    expect(loadingSpy.setLoading).toHaveBeenCalledWith(false);
    expect(dialogRefSpy.close).toHaveBeenCalledWith(null);
  }));

  it('should call dialogRef.close(null) when close() is invoked', () => {
    component.close();
    expect(dialogRefSpy.close).toHaveBeenCalledWith(null);
  });
});
