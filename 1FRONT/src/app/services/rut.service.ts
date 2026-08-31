import { Injectable } from '@angular/core';

export interface RutValidationResult {
  isValid: boolean;
  normalized?: string;
  raw?: string;
  error?: 'INVALID_FORMAT' | 'INVALID_DV' | 'TOO_SHORT';
}

@Injectable({
  providedIn: 'root'
})
export class RutService {

  constructor() { }

  /**
   * Calcula el dígito verificador (DV) de un RUT chileno usando módulo 11.
   * @param rutSinDV - String con solo dígitos (sin DV ni formato)
   * @returns El DV calculado: "0"-"9" o "K"
   */
  calcularDV(rutSinDV: string): string {
    let suma = 0;
    let multiplo = 2;
    for (let i = rutSinDV.length - 1; i >= 0; i--) {
      suma += parseInt(rutSinDV.charAt(i), 10) * multiplo;
      multiplo = multiplo === 7 ? 2 : multiplo + 1;
    }
    const resto = suma % 11;
    const dvCalc = 11 - resto;
    if (dvCalc === 11) return '0';
    if (dvCalc === 10) return 'K';
    return dvCalc.toString();
  }

  /**
   * Valida un RUT completo (base + DV) y retorna resultado con normalized si es válido.
   */
  validarRut(rutCompleto: string): RutValidationResult {
    if (!rutCompleto || rutCompleto.trim() === '') {
      return { isValid: false, error: 'INVALID_FORMAT' };
    }

    const cleaned = rutCompleto.replace(/[^0-9kK]/g, '').toUpperCase();
    if (cleaned.length < 2) {
      return { isValid: false, error: 'INVALID_FORMAT' };
    }

    const dv = cleaned.slice(-1);
    const base = cleaned.slice(0, -1);

    if (base.length < 7 || base.length > 9) {
      return { isValid: false, error: 'INVALID_FORMAT' };
    }

    const expectedDv = this.calcularDV(base);
    if (expectedDv !== dv) {
      return { isValid: false, raw: rutCompleto, error: 'INVALID_DV' };
    }

    return { isValid: true, normalized: `${base}-${dv}`, raw: rutCompleto };
  }

  /**
   * Formatea un RUT (solo dígitos base) al formato XX.XXX.XXX-X.
   * Calcula el DV automáticamente.
   */
  formatearRut(rutSinDV: string): string {
    const dv = this.calcularDV(rutSinDV);
    let formatted = '';
    let remaining = rutSinDV;
    while (remaining.length > 3) {
      formatted = `.${remaining.slice(-3)}${formatted}`;
      remaining = remaining.slice(0, -3);
    }
    return `${remaining}${formatted}-${dv}`;
  }
}
