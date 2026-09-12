import {
  normalize,
  similarity,
  similarityAtLeast,
  findDuplicates,
  levenshtein,
} from './duplicate-matcher';

describe('duplicate-matcher', () => {
  describe('normalize', () => {
    it('lowercases, strips accents and punctuation, collapses spaces', () => {
      expect(normalize('  WalMar Calera  ')).toBe('walmar calera');
      expect(normalize('12.345.678-5')).toBe('123456785');
      expect(normalize('María José Pérez')).toBe('maria jose perez');
    });
  });

  describe('similarity', () => {
    it('returns 1 for identical strings', () => {
      expect(similarity('walmart', 'walmart')).toBe(1);
    });
    it('matches walmar vs walmart above the 0.82 threshold', () => {
      expect(similarity('walmar', 'walmart')).toBeGreaterThanOrEqual(0.82);
    });
    it('returns 1 for two empty strings', () => {
      expect(similarity('', '')).toBe(1);
    });
  });

  describe('similarityAtLeast', () => {
    it('returns the exact similarity when minSim is reachable', () => {
      expect(similarityAtLeast('walmar', 'walmart', 0.82)).toBe(similarity('walmar', 'walmart'));
      expect(similarityAtLeast('walmart', 'walmart', 0.9)).toBe(1);
    });
    it('short-circuits to 0 when the length gap makes minSim impossible', () => {
      // 1 - 4/9 < 0.82 → imposible sin recorrer la matriz
      expect(similarityAtLeast('sodimac', 'sodimac chin', 0.82)).toBe(0);
      expect(similarityAtLeast('', '', 0.9)).toBe(1);
    });
  });

  describe('levenshtein', () => {
    it('computes edit distance', () => {
      expect(levenshtein('kitten', 'sitting')).toBe(3);
      expect(levenshtein('abc', 'abc')).toBe(0);
    });
  });

  const candidates = [
    { id: 1, name: 'walmart calera', rut_raw: '76042014k', phone: '+56 9 1234 5678', address: 'calera 123', email: 'calera@walmart.cl', company_name: '' },
    { id: 2, name: 'juan perez', rut_raw: '12345678-5', phone: '9 8765 4321', address: 'av independencia 44', email: 'juan@mail.cl', company_name: '' },
    { id: 3, name: 'sodimac quinta vergara', rut_raw: '96792430k', phone: '', address: '', email: '', company_name: 'sodimac' },
  ];

  it('matches by exact RUT plus fuzzy name', () => {
    const result = findDuplicates(candidates, { name: 'walmar calera', rut: '76042014k' });
    expect(result.length).toBe(1);
    expect(result[0].client.id).toBe(1);
    expect(result[0].fields.map((f) => f.field).sort()).toEqual(['name', 'rut']);
  });

  it('does not match when RUT is garbage (0)', () => {
    const result = findDuplicates(candidates, { name: 'juan perez', rut: '0' });
    expect(result.length).toBe(1);
    expect(result[0].fields.map((f) => f.field)).toEqual(['name']); // solo nombre, no rut
  });

  it('matches by phone last 8 digits', () => {
    const result = findDuplicates(candidates, { name: 'alguien mas', rut: '', phone: '9 1234 5678' });
    expect(result.length).toBe(1);
    expect(result[0].client.id).toBe(1);
    expect(result[0].fields[0].field).toBe('phone');
  });

  it('matches by exact email', () => {
    const result = findDuplicates(candidates, { name: 'otro', email: 'juan@mail.cl' });
    expect(result.length).toBe(1);
    expect(result[0].client.id).toBe(2);
  });

  it('matches company by fuzzy name when has_company', () => {
    const result = findDuplicates(candidates, { name: 'sucursal nueva', has_company: true, company_name: 'sodimac' });
    expect(result.length).toBe(1);
    expect(result[0].fields.some((f) => f.field === 'company')).toBe(true);
  });

  it('does not compare company when has_company is false', () => {
    const result = findDuplicates(candidates, { name: 'sucursal nueva', has_company: false, company_name: 'sodimac' });
    expect(result.every((m) => !m.fields.some((f) => f.field === 'company'))).toBe(true);
  });

  it('sorts by number of matched fields and caps the limit', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({
      id: i + 10,
      name: i === 0 ? 'walmar calera' : `cliente parecido ${i}`,
      rut_raw: i === 0 ? '76042014k' : `${i}0`,
      phone: '',
      address: '',
      email: '',
      company_name: '',
    }));
    const result = findDuplicates(many, { name: 'walmar calera', rut: '76042014k' }, 5);
    expect(result.length).toBeLessThanOrEqual(5);
    expect(result[0].fields.length).toBe(2); // el más parecido primero
  });
});