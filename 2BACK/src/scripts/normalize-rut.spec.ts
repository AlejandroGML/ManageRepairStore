import { normalizeRut } from '../services/rut.service';

describe('normalizeRut', () => {
  it('should normalize RUT with dots and dash', () => {
    expect(normalizeRut('12.345.678-5')).toBe('12345678-5');
  });

  it('should return normalized when already clean format', () => {
    expect(normalizeRut('12345678-5')).toBe('12345678-5');
  });

  it('should normalize bare number with computed DV', () => {
    expect(normalizeRut('12345678')).toBe('12345678-5');
  });

  it('should normalize RUT with K verifier', () => {
    expect(normalizeRut('10000013-K')).toBe('10000013-K');
  });

  it('should normalize lowercase k input to uppercase K', () => {
    expect(normalizeRut('10000013-k')).toBe('10000013-K');
  });

  it('should return null for empty string', () => {
    expect(normalizeRut('')).toBeNull();
  });

  it('should return null for non-numeric input', () => {
    expect(normalizeRut('SIN RUT')).toBeNull();
  });

  it('should return null for too-short input', () => {
    expect(normalizeRut('12')).toBeNull();
  });
});
