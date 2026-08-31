import { calcularDV, validarRut, normalizeRut, RutValidationResult } from './rut.service';

describe('calcularDV', () => {
  it('should compute DV=5 for 8-digit RUT 12345678', () => {
    expect(calcularDV('12345678')).toBe('5');
  });

  it('should compute DV=1 for all-ones RUT 11111111', () => {
    expect(calcularDV('11111111')).toBe('1');
  });

  it('should compute DV=0 when 11 - resto equals 11', () => {
    // 10000004 → sum % 11 = 0 → 11 - 0 = 11 → DV = '0'
    expect(calcularDV('10000004')).toBe('0');
  });

  it('should compute DV=K when 11 - resto equals 10', () => {
    // 10000013 → sum % 11 = 1 → 11 - 1 = 10 → DV = 'K'
    expect(calcularDV('10000013')).toBe('K');
  });

  it('should handle 9-digit base numbers', () => {
    const result = calcularDV('123456789');
    expect(result).toMatch(/^[0-9K]$/);
  });
});

describe('validarRut', () => {
  it('should return isValid=true for well-formed RUT with matching DV', () => {
    const result = validarRut('12345678-5');
    expect(result.isValid).toBe(true);
    expect(result.normalized).toBe('12345678-5');
  });

  it('should return isValid=true for RUT with DV=K', () => {
    const result = validarRut('10000013-K');
    expect(result.isValid).toBe(true);
    expect(result.normalized).toBe('10000013-K');
  });

  it('should return isValid=true for RUT with DV=0', () => {
    const result = validarRut('10000004-0');
    expect(result.isValid).toBe(true);
    expect(result.normalized).toBe('10000004-0');
  });

  it('should return INVALID_DV when DV does not match', () => {
    const result = validarRut('12345678-0');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('INVALID_DV');
  });

  it('should return INVALID_FORMAT for too-short input', () => {
    const result = validarRut('123');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('INVALID_FORMAT');
  });

  it('should return INVALID_FORMAT for empty input', () => {
    const result = validarRut('');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('INVALID_FORMAT');
  });

  it('should handle RUT with dots and dash format', () => {
    const result = validarRut('12.345.678-5');
    expect(result.isValid).toBe(true);
    expect(result.normalized).toBe('12345678-5');
  });

  it('should handle lowercase k in DV', () => {
    const result = validarRut('10000013-k');
    expect(result.isValid).toBe(true);
    expect(result.normalized).toBe('10000013-K');
  });
});

describe('normalizeRut', () => {
  it('should normalize 8-digit bare number', () => {
    expect(normalizeRut('12345678')).toBe('12345678-5');
  });

  it('should normalize 9-digit bare number', () => {
    const result = normalizeRut('123456789');
    const dv = calcularDV('123456789');
    expect(result).toBe(`123456789-${dv}`);
  });

  it('should return normalized when DV matches existing format', () => {
    expect(normalizeRut('12345678-5')).toBe('12345678-5');
  });

  it('should normalize with dots and dash', () => {
    expect(normalizeRut('12.345.678-5')).toBe('12345678-5');
  });

  it('should return null for non-numeric input', () => {
    expect(normalizeRut('SIN RUT')).toBeNull();
  });

  it('should return null for placeholder zeros', () => {
    expect(normalizeRut('000000000')).toBeNull();
  });

  it('should return null for empty string', () => {
    expect(normalizeRut('')).toBeNull();
  });

  it('should return null for too-short input', () => {
    expect(normalizeRut('12')).toBeNull();
  });

  it('should return null when existing DV does not match computed DV', () => {
    expect(normalizeRut('12345678-0')).toBeNull();
  });

  it('should normalize with lowercase k in input', () => {
    expect(normalizeRut('10000013-k')).toBe('10000013-K');
  });

  it('should normalize 8-digit RUT with DV=0', () => {
    expect(normalizeRut('10000004-0')).toBe('10000004-0');
  });

  it('should normalize RUT with K DV and no dash', () => {
    expect(normalizeRut('76042014k')).toBe('76042014-K');
  });

  it('should normalize 8-digit RUT with K DV and no dash', () => {
    expect(normalizeRut('10751614k')).toBe('10751614-K');
  });
});
