import { Injectable } from '@angular/core';
import {
  RutValidationResult,
  calcularDV,
  validarRut,
  formatearRut,
} from '@shared/rut/rut.utils';

export { RutValidationResult };

/**
 * Facade Angular — la lógica real vive en shared/rut/rut.utils.ts (fuente única front+back).
 * Se mantiene la API de servicio para no romper la DI existente (rut-input.component).
 */
@Injectable({
  providedIn: 'root',
})
export class RutService {
  constructor() {}

  calcularDV(rutSinDV: string): string {
    return calcularDV(rutSinDV);
  }

  validarRut(rutCompleto: string): RutValidationResult {
    return validarRut(rutCompleto);
  }

  formatearRut(rutSinDV: string): string {
    return formatearRut(rutSinDV);
  }
}
