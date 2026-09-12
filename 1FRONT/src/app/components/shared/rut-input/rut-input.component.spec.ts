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

  // ─── Formato progresivo (mientras se escribe) ──────────────────────────

  it('onInput agrupa con puntos en caliente (12.345.678)', () => {
    component.onInput('12345678');
    expect(component.displayValue).toBe('12.345.678');
  });

  it('onInput muestra -DV en caliente al completar 9 caracteres', () => {
    component.onInput('123456785');
    expect(component.displayValue).toBe('12.345.678-5');
  });

  // ─── Variantes de presentación ────────────────────────────────────────

  it('variant plain renderiza un input estándar sin mat-form-field', () => {
    fixture.componentRef.setInput('variant', 'plain');
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('input.rut-input-field')).toBeTruthy();
    expect(compiled.querySelector('mat-form-field')).toBeNull();
  });

  it('variant material (default) renderiza mat-form-field', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('mat-form-field')).not.toBeNull();
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

  // ─── DV explícito sin guión (bug fix: 9 dígitos = base 8 + DV) ─────────

  it('onBlur valida 9 dígitos sin guión como base(8)+DV y formatea (12.345.678-5)', () => {
    component.onInput('123456785');
    component.onBlur();
    fixture.detectChanges();
    expect(component.rutError).toBe('');
    expect(component.displayValue).toBe('12.345.678-5');
  });

  it('onBlur marca DV no válido en 9 dígitos sin guión (no computa DV sobre los 9)', () => {
    component.onInput('123456789'); // DV esperado es 5, no 9
    component.onBlur();
    fixture.detectChanges();
    expect(component.rutError).toContain('DV no válido — se esperaba 5');
  });

  it('onBlur acepta DV K en 9 caracteres sin guión (18.153.110-K)', () => {
    component.onInput('18153110K');
    component.onBlur();
    fixture.detectChanges();
    expect(component.rutError).toBe('');
    expect(component.displayValue).toBe('18.153.110-K');
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
