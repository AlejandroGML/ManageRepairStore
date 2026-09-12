import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';

import { ModalManageCategoriesComponent } from './modal-manage-categories.component';
import { CategoriesApiService, CategoryRow } from 'src/app/services/categories.api.service';
import { ModalConfirmComponent } from '../../shared/modal-confirm/modal-confirm.component';
import { SnackbarService } from 'src/app/services/snackbar.service';

describe('ModalManageCategoriesComponent', () => {
  let component: ModalManageCategoriesComponent;
  let fixture: ComponentFixture<ModalManageCategoriesComponent>;
  let categoriesApiSpy: jasmine.SpyObj<CategoriesApiService>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;
  let snackbarSpy: jasmine.SpyObj<SnackbarService>;

  const row = (over: Partial<CategoryRow>): CategoryRow => ({
    id: 1,
    name: 'Filtros',
    productCount: 0,
    ...over,
  });

  beforeEach(async () => {
    categoriesApiSpy = jasmine.createSpyObj('CategoriesApiService', [
      'getCategories', 'createCategory', 'updateCategory', 'deleteCategory',
    ]);
    categoriesApiSpy.getCategories.and.returnValue(of([row({}), row({ id: 2, name: 'Resistencias', productCount: 19 })]));
    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    snackbarSpy = jasmine.createSpyObj('SnackbarService', ['success', 'error', 'openSnackBar']);

    await TestBed.configureTestingModule({
      imports: [ModalManageCategoriesComponent, NoopAnimationsModule],
      providers: [
        { provide: CategoriesApiService, useValue: categoriesApiSpy },
        { provide: MatDialog, useValue: dialogSpy },
        { provide: SnackbarService, useValue: snackbarSpy },
        { provide: MatDialogRef, useValue: jasmine.createSpyObj('MatDialogRef', ['close']) },
      ],
    })
      // MatDialogModule (en SHARED_IMPORTS) provee el MatDialog real a nivel
      // componente y sombrea el del TestBed — override local obligatorio.
      .overrideComponent(ModalManageCategoriesComponent, {
        set: { providers: [{ provide: MatDialog, useValue: dialogSpy }] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ModalManageCategoriesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads categories on open', () => {
    expect(component.categories.map((c) => c.name)).toEqual(['Filtros', 'Resistencias']);
  });

  it('creates a category, marks dirty and reloads', () => {
    categoriesApiSpy.createCategory.and.returnValue(of(row({ id: 3, name: 'Nueva' })));

    component.startAdd();
    component.newName = '  Nueva  ';
    component.saveAdd();

    expect(categoriesApiSpy.createCategory).toHaveBeenCalledWith('Nueva');
    expect(snackbarSpy.success).toHaveBeenCalledWith('Categoría creada');
    expect(component.adding).toBeFalse();
    expect(categoriesApiSpy.getCategories).toHaveBeenCalledTimes(2);
  });

  it('shows the backend conflict message when the name already exists', () => {
    categoriesApiSpy.createCategory.and.returnValue(
      throwError(() => ({ error: { message: 'Ya existe la categoría "Filtros"' } })),
    );

    component.startAdd();
    component.newName = 'Filtros';
    component.saveAdd();

    expect(snackbarSpy.error).toHaveBeenCalledWith('Ya existe la categoría "Filtros"');
    expect(component.adding).toBeTrue();
  });

  it('renames a category inline', () => {
    categoriesApiSpy.updateCategory.and.returnValue(of(row({ name: 'Filtros de aire' })));

    component.startEdit(row({}));
    component.editName = 'Filtros de aire';
    component.saveEdit();

    expect(categoriesApiSpy.updateCategory).toHaveBeenCalledWith(1, 'Filtros de aire');
    expect(component.editingId).toBeNull();
    expect(categoriesApiSpy.getCategories).toHaveBeenCalledTimes(2);
  });

  it('blocks deleting a category with products without opening a confirm', () => {
    component.confirmDelete(row({ id: 2, name: 'Resistencias', productCount: 19 }));

    expect(dialogSpy.open).not.toHaveBeenCalled();
    expect(categoriesApiSpy.deleteCategory).not.toHaveBeenCalled();
    expect(snackbarSpy.error).toHaveBeenCalledWith(jasmine.stringContaining('19'));
  });

  it('deletes an empty category after confirmation', () => {
    categoriesApiSpy.deleteCategory.and.returnValue(of({ success: true }));
    const confirmRef = { afterClosed: () => of(true) };
    dialogSpy.open.and.returnValue(confirmRef as any);

    component.confirmDelete(row({}));

    expect(dialogSpy.open).toHaveBeenCalledWith(ModalConfirmComponent, jasmine.objectContaining({ data: { message: '¿Eliminar la categoría "Filtros"?' } }));
    expect(categoriesApiSpy.deleteCategory).toHaveBeenCalledWith(1);
    expect(snackbarSpy.success).toHaveBeenCalledWith('Categoría eliminada');
  });

  it('closes reporting whether there were changes', () => {
    component.close();
    expect((component as any).dialogRef.close).toHaveBeenCalledWith(false);

    categoriesApiSpy.createCategory.and.returnValue(of(row({ id: 3, name: 'Nueva' })));
    component.startAdd();
    component.newName = 'Nueva';
    component.saveAdd();
    component.close();
    expect((component as any).dialogRef.close).toHaveBeenCalledWith(true);
  });
});
