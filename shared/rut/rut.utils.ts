/**
 * RUT chileno — utilidades compartidas entre frontend y backend.
 * Fuente única de verdad para validación, normalización y formato.
 */

export interface RutValidationResult {
  isValid: boolean;
  normalized?: string;
  raw?: string;
  error?: 'INVALID_FORMAT' | 'INVALID_DV' | 'TOO_SHORT';
}

/**
 * Calcula el dígito verificador (DV) de un RUT chileno usando módulo 11.
 * @param rutSinDV - String con solo dígitos (sin DV ni formato)
 * @returns El DV calculado: "0"-"9" o "K"
 */
export function calcularDV(rutSinDV: string): string {
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
 * Acepta formatos con/sin puntos, guiones, y K/k mayúscula/minúscula.
 */
export function validarRut(rutCompleto: string): RutValidationResult {
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

  const expectedDv = calcularDV(base);
  if (expectedDv !== dv) {
    return { isValid: false, raw: rutCompleto, error: 'INVALID_DV' };
  }

  return { isValid: true, normalized: `${base}-${dv}`, raw: rutCompleto };
}

/**
 * Normaliza un string RUT crudo al formato `XXXXXXXX-X`.
 * Retorna null si no se puede normalizar (inválido, placeholder, etc.)
 */
export function normalizeRut(rutRaw: string): string | null {
  if (!rutRaw || rutRaw.trim() === '') return null;

  const cleaned = rutRaw.replace(/[^0-9kK]/g, '').toUpperCase();
  if (cleaned.length === 0) return null;

  // Rechazar placeholders con solo ceros
  if (/^0+$/.test(cleaned)) return null;

  const hasDash = /[-]/.test(rutRaw);

  if (hasDash && cleaned.length >= 9 && cleaned.length <= 10) {
    // Tiene formato con guión → separar base + DV
    const dv = cleaned.slice(-1);
    const base = cleaned.slice(0, -1);
    if (base.length >= 7 && base.length <= 9) {
      const expectedDv = calcularDV(base);
      if (expectedDv === dv) {
        return `${base}-${dv}`;
      }
    }
    return null;
  }

  if (!hasDash && cleaned.length >= 7 && cleaned.length <= 9) {
    const lastChar = cleaned.slice(-1);
    // If last char is K/k, it's a provided DV without dash → validate
    if (/[Kk]/.test(lastChar)) {
      const dv = 'K';
      const base = cleaned.slice(0, -1);
      if (base.length >= 7 && base.length <= 8) {
        const expectedDv = calcularDV(base);
        if (expectedDv === dv) {
          return `${base}-${dv}`;
        }
      }
      return null;
    }
    // All digits, no DV provided → compute DV
    const dv = calcularDV(cleaned);
    return `${cleaned}-${dv}`;
  }

  return null;
}

/**
 * Formatea un RUT (solo dígitos base) al formato XX.XXX.XXX-X.
 * Calcula el DV automáticamente.
 */
export function formatearRut(rutSinDV: string): string {
  const dv = calcularDV(rutSinDV);
  let formatted = '';
  let remaining = rutSinDV;
  while (remaining.length > 3) {
    formatted = `.${remaining.slice(-3)}${formatted}`;
    remaining = remaining.slice(0, -3);
  }
  return `${remaining}${formatted}-${dv}`;
}
