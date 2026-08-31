import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { By } from '@angular/platform-browser';

import { RutInputComponent } from './rut-input.component';

describe('RutInputComponent', () => {
  let component: RutInputComponent;
  let fixture: ComponentFixture<RutInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        ReactiveFormsModule,
        NoopAnimationsModule,
        MatFormFieldModule,
        MatInputModule,
        RutInputComponent,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RutInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ─── CVA: writeValue ──────────────────────────────────────────────────

  it('writeValue actualiza el input con el valor recibido', () => {
    component.writeValue('12345678');
    expect(component.value).toBe('12345678');
  });

  it('writeValue con null no cambia el valor', () => {
    component.writeValue('12345678');
    component.writeValue(null);
    expect(component.value).toBe('12345678');
  });

  // ─── CVA: registerOnChange / registerOnTouched ─────────────────────────

  it('registerOnChange asigna la función onChange', () => {
    const fn = jasmine.createSpy('onChange');
    component.registerOnChange(fn);
    expect(component.onChange).toBe(fn);
  });

  it('registerOnTouched asigna la función onTouched', () => {
    const fn = jasmine.createSpy('onTouched');
    component.registerOnTouched(fn);
    expect(component.onTouched).toBe(fn);
  });

  // ─── setDisabledState ─────────────────────────────────────────────────

  it('setDisabledState deshabilita el input', () => {
    component.setDisabledState(true);
    fixture.detectChanges();
    const input = fixture.debugElement.query(By.css('input')).nativeElement;
    expect(input.disabled).toBeTrue();
  });

  it('setDisabledState habilita el input cuando se pasa false', () => {
    component.setDisabledState(true);
    component.setDisabledState(false);
    fixture.detectChanges();
    const input = fixture.debugElement.query(By.css('input')).nativeElement;
    expect(input.disabled).toBeFalse();
  });

  // ─── Formateo automático (on blur) ────────────────────────────────────

  it('onInput almacena solo dígitos (limpia caracteres no numéricos)', () => {
    component.onInput('12.345.678-5');
    expect(component.value).toBe('123456785');
  });

  it('onInput rechaza caracteres no numéricos excepto K', () => {
    component.onInput('12ABC');
    expect(component.value).toBe('12');
  });

  it('onBlur formatea a XX.XXX.XXX-X cuando hay ≥8 dígitos', () => {
    component.onInput('12345678');
    component.onBlur();
    fixture.detectChanges();
    expect(component.displayValue).toBe('12.345.678-5');
  });

  it('onBlur NO formatea cuando hay <8 dígitos', () => {
    component.onInput('123');
    component.onBlur();
    fixture.detectChanges();
    expect(component.displayValue).toBe('123');
  });

  // ─── Validación en blur ───────────────────────────────────────────────

  it('onBlur marca touched y valida — setea error en control para RUT inválido', () => {
    const onChange = jasmine.createSpy('onChange');
    component.registerOnChange(onChange);
    const onTouched = jasmine.createSpy('onTouched');
    component.registerOnTouched(onTouched);

    // Usar un RUT con guión y DV incorrecto
    component.onInput('12345678-9'); // raw con guión; value = '123456789'
    component.onBlur();
    fixture.detectChanges();

    expect(onTouched).toHaveBeenCalled();
    expect(component.rutError).toContain('DV no válido');
  });

  it('onBlur no muestra error con RUT válido (8 dígitos sin DV)', () => {
    component.onInput('12345678');
    component.onBlur();
    fixture.detectChanges();
    expect(component.rutError).toBe('');
    expect(component.displayValue).toBe('12.345.678-5');
  });

  it('onBlur no muestra error con RUT válido explícito (con guión)', () => {
    component.onInput('12345678-5');
    component.onBlur();
    fixture.detectChanges();
    expect(component.rutError).toBe('');
  });

  // ─── Integración con FormGroup ────────────────────────────────────────

  it('propagación vía onChange actualiza el valor del form padre', () => {
    const control = new FormControl('');
    component.registerOnChange((val: string) => control.setValue(val));
    component.writeValue('12345678');
    component.onChange('12345678');
    expect(control.value).toBe('12345678');
  });

  // ─── Placeholder ──────────────────────────────────────────────────────

  it('placeholder se muestra correctamente', () => {
    fixture.detectChanges();
    const label = fixture.debugElement.query(By.css('mat-label'));
    expect(label.nativeElement.textContent).toContain('RUT');
  });
});
