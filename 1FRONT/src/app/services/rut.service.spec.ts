import { RutService, RutValidationResult } from './rut.service';

describe('RutService', () => {
  let service: RutService;

  beforeEach(() => {
    service = new RutService();
  });

  // ─── calcularDV ──────────────────────────────────────────────────────────

  describe('calcularDV', () => {
    it('calcula DV correcto para 8 dígitos — caso típico', () => {
      // RUT: 12.345.678-5 → base 12345678
      expect(service.calcularDV('12345678')).toBe('5');
    });

    it('calcula DV = 0 cuando 11 - resto = 11', () => {
      // RUT con DV=0 conocido
      expect(service.calcularDV('10000004')).toBe('0');
    });

    it('calcula DV = K cuando 11 - resto = 10', () => {
      // 23618062-K → base 23618062, sum % 11 = 1 → 11-1=10 → K
      expect(service.calcularDV('23618062')).toBe('K');
    });

    it('calcula DV para 7 dígitos (RUT antiguo)', () => {
      expect(service.calcularDV('1234567')).toBe('4');
    });

    it('calcula DV para 9 dígitos', () => {
      const dv = service.calcularDV('123456789');
      expect(dv).toMatch(/^[0-9K]$/);
    });
  });

  // ─── validarRut ──────────────────────────────────────────────────────────

  describe('validarRut', () => {
    it('retorna isValid=true para RUT válido completo 12.345.678-5', () => {
      const result = service.validarRut('12.345.678-5');
      expect(result.isValid).toBeTrue();
      expect(result.normalized).toBe('12345678-5');
    });

    it('retorna isValid=true para RUT con DV=K (23618062-K)', () => {
      const result = service.validarRut('23618062-K');
      expect(result.isValid).toBeTrue();
      expect(result.normalized).toBe('23618062-K');
    });

    it('retorna isValid=true para RUT con DV=0 (10000004-0)', () => {
      const result = service.validarRut('10000004-0');
      expect(result.isValid).toBeTrue();
      expect(result.normalized).toBe('10000004-0');
    });

    it('retorna isValid=false con error INVALID_DV cuando DV no coincide', () => {
      const result = service.validarRut('12345678-9');
      expect(result.isValid).toBeFalse();
      expect(result.error).toBe('INVALID_DV');
    });

    it('retorna isValid=false con error INVALID_FORMAT para string vacío', () => {
      const result = service.validarRut('');
      expect(result.isValid).toBeFalse();
      expect(result.error).toBe('INVALID_FORMAT');
    });

    it('retorna isValid=false con error INVALID_FORMAT para menos de 2 caracteres', () => {
      const result = service.validarRut('1');
      expect(result.isValid).toBeFalse();
      expect(result.error).toBe('INVALID_FORMAT');
    });

    it('retorna isValid=false con error INVALID_FORMAT para non-numeric "SIN RUT"', () => {
      const result = service.validarRut('SIN RUT');
      expect(result.isValid).toBeFalse();
      expect(result.error).toBe('INVALID_FORMAT');
    });

    it('acepta RUT con k minúscula y retorna K mayúscula en normalized', () => {
      const result = service.validarRut('23618062-k');
      expect(result.isValid).toBeTrue();
      expect(result.normalized).toBe('23618062-K');
    });
  });

  // ─── formatearRut ────────────────────────────────────────────────────────

  describe('formatearRut', () => {
    it('formatea 12345678 a 12.345.678-5', () => {
      expect(service.formatearRut('12345678')).toBe('12.345.678-5');
    });

    it('formatea 1234567 a 1.234.567-4', () => {
      expect(service.formatearRut('1234567')).toBe('1.234.567-4');
    });

    it('formatea 123456789 a 123.456.789-X', () => {
      const formatted = service.formatearRut('123456789');
      expect(formatted).toMatch(/^\d{3}\.\d{3}\.\d{3}-\d$/);
    });
  });
});
