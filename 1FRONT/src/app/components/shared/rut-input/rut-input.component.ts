import { Component, forwardRef, Input, inject } from '@angular/core';
import { SHARED_IMPORTS } from 'src/app/shared.imports';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, NG_VALIDATORS, AbstractControl, ValidationErrors, Validator } from '@angular/forms';
import { RutService } from 'src/app/services/rut.service';
import { RutPipe } from 'src/app/pipes/rut.pipe';

@Component({
  selector: 'app-rut-input',
  templateUrl: './rut-input.component.html',
  styleUrls: ['./rut-input.component.css'],
  standalone: true,
  imports: [SHARED_IMPORTS, RutPipe],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RutInputComponent),
      multi: true,
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => RutInputComponent),
      multi: true,
    },
  ],
})
export class RutInputComponent implements ControlValueAccessor, Validator {
  @Input() placeholder: string = 'Ej: 12.345.678-5';

  /** Valor interno sin formato (solo dígitos) */
  value: string = '';
  /** Valor mostrado al usuario (con formato) */
  displayValue: string = '';
  /** Mensaje de error de RUT */
  rutError: string = '';
  /** Estado disabled */
  disabled: boolean = false;
  /** Entrada original del usuario (para detectar si escribió un guión/DV explícitamente) */
  private rawInput: string = '';

  onChange: (value: string) => void = () => {};
  onTouched: () => void = () => {};

  private rutService = inject(RutService);

  // ─── ControlValueAccessor ─────────────────────────────────────────────

  writeValue(obj: any): void {
    if (obj !== null && obj !== undefined) {
      const strVal = String(obj);
      this.value = strVal.replace(/[^0-9kK]/g, '').toUpperCase();
      this.displayValue = this.formatRutDisplay(this.value);
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  // ─── Eventos del input ────────────────────────────────────────────────

  onInput(inputValue: string): void {
    this.rawInput = inputValue;
    const cleaned = inputValue.replace(/[^0-9kK]/g, '').toUpperCase();

    if (cleaned !== this.value) {
      this.value = cleaned;
      this.rutError = '';
    }

    // Durante escritura, mostrar solo los caracteres limpios
    this.displayValue = cleaned;

    this.onChange(this.value);
  }

  onBlur(): void {
    this.onTouched();

    if (this.value.length === 0) {
      this.rutError = '';
      this.onChange(this.value);
      return; // Campo vacío — sin error
    }

    if (this.value.length < 8) {
      this.rutError = 'RUT muy corto — debe tener al menos 8 dígitos';
      this.onChange(this.value);
      return;
    }

    // Detectar si el usuario escribió un guión (DV explícito)
    const hasExplicitDash = this.rawInput.includes('-');

    if (hasExplicitDash && this.value.length >= 9) {
      // El usuario especificó un DV explícitamente — validarlo
      const base = this.value.slice(0, -1);
      const dv = this.value.slice(-1);
      const expectedDv = this.rutService.calcularDV(base);

      if (expectedDv !== dv) {
        this.rutError = `DV no válido — se esperaba ${expectedDv}`;
        this.onChange(this.value);
        return;
      }

      // DV explícito válido
      this.displayValue = this.formatRutDisplay(this.value);
      this.rutError = '';
      this.onChange(this.value);
      return;
    }

    // Sin DV explícito — computar DV automáticamente
    if (this.value.length >= 8 && this.value.length <= 9 && /^\d+$/.test(this.value)) {
      const dv = this.rutService.calcularDV(this.value);
      const normalized = `${this.value}-${dv}`;
      this.value = normalized.replace(/-/g, '');
      this.displayValue = this.formatRutDisplay(this.value);
      this.rutError = '';
      this.onChange(this.value);
      return;
    }

    this.rutError = 'RUT inválido';
    this.onChange(this.value);
  }

  // ─── Validator ──────────────────────────────────────────────────────

  validate(_control: AbstractControl): ValidationErrors | null {
    return this.rutError ? { rutInvalido: this.rutError } : null;
  }

  // ─── Utilidades ───────────────────────────────────────────────────────

  private formatRutDisplay(rutStr: string): string {
    if (!rutStr || rutStr.length < 2) return rutStr || '';
    const dv = rutStr.slice(-1);
    const base = rutStr.slice(0, -1);
    let formatted = '';
    let remaining = base;
    while (remaining.length > 3) {
      formatted = `.${remaining.slice(-3)}${formatted}`;
      remaining = remaining.slice(0, -3);
    }
    return `${remaining}${formatted}-${dv}`;
  }

  limpiarError(): void {
    this.rutError = '';
  }
}
