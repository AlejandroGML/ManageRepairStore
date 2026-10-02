import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';

import { ModalCompaniesComponent } from './modal-companies.component';
import { CompaniesApiService, CompanyRow } from 'src/app/services/companies.api.service';
import { SnackbarService } from 'src/app/services/snackbar.service';

describe('ModalCompaniesComponent', () => {
  let component: ModalCompaniesComponent;
  let fixture: ComponentFixture<ModalCompaniesComponent>;
  let companiesApiSpy: jasmine.SpyObj<CompaniesApiService>;
  let snackbarSpy: jasmine.SpyObj<SnackbarService>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<ModalCompaniesComponent>>;

  const rows: CompanyRow[] = [
    { id: 1, name: 'sodimac', rutNormalizado: '96792430-K', branchCount: 8 },
    { id: 2, name: 'lider', rutNormalizado: '76134941-4', branchCount: 5 },
  ];

  beforeEach(async () => {
    companiesApiSpy = jasmine.createSpyObj('CompaniesApiService', ['list', 'rename', 'search', 'clients']);
    snackbarSpy = jasmine.createSpyObj('SnackbarService', ['openSnackBar', 'success', 'error']);
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
    companiesApiSpy.list.and.returnValue(of({ items: rows, total: 12, page: 1, limit: 10 } as any));

    await TestBed.configureTestingModule({
      imports: [ModalCompaniesComponent, NoopAnimationsModule],
      providers: [
        { provide: CompaniesApiService, useValue: companiesApiSpy },
        { provide: SnackbarService, useValue: snackbarSpy },
        { provide: MatDialogRef, useValue: dialogRefSpy },
      ],
    }).compileComponents();

    TestBed.overrideComponent(ModalCompaniesComponent, {
      set: { providers: [{ provide: MatDialogRef, useValue: dialogRefSpy }] },
    });

    fixture = TestBed.createComponent(ModalCompaniesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should load the first page (10 per page) and render the rows', () => {
    expect(companiesApiSpy.list).toHaveBeenCalledWith(1, 10);
    expect(component.rows.length).toBe(2);
    expect(component.total).toBe(12);
    expect(component.totalPages).toBe(2);
  });

  it('should paginate forward and back', () => {
    component.nextPage();
    expect(companiesApiSpy.list).toHaveBeenCalledWith(2, 10);

    component.prevPage();
    expect(companiesApiSpy.list).toHaveBeenCalledWith(1, 10);
  });

  it('should rename inline and expose the change on close', () => {
    companiesApiSpy.rename.and.returnValue(of({ ...rows[0], name: 'Walmart Chile' } as any));

    component.startEdit(rows[0]);
    expect(component.editingId).toBe(1);

    component.editName.setValue('Walmart Chile');
    component.saveEdit(rows[0]);

    expect(companiesApiSpy.rename).toHaveBeenCalledWith(1, 'Walmart Chile');
    expect(rows[0].name).toBe('Walmart Chile');
    expect(snackbarSpy.success).toHaveBeenCalled();

    component.close();
    expect(dialogRefSpy.close).toHaveBeenCalledWith([{ id: 1, name: 'Walmart Chile' }]);
  });

  it('should surface a 409 duplicate-name error and keep editing', () => {
    companiesApiSpy.rename.and.returnValue(
      throwError(() => ({ error: { message: 'Ya existe una empresa con ese nombre: "sodimac"' } })),
    );

    component.startEdit(rows[0]);
    component.editName.setValue('sodimac');
    component.saveEdit(rows[0]);

    expect(snackbarSpy.openSnackBar).toHaveBeenCalledWith(
      'Ya existe una empresa con ese nombre: "sodimac"',
    );
    expect(component.editingId).toBe(1); // sigue editando
  });

  it('should ignore empty names', () => {
    component.startEdit(rows[0]);
    component.editName.setValue('   ');
    component.saveEdit(rows[0]);
    expect(companiesApiSpy.rename).not.toHaveBeenCalled();
  });
});
