/**
 * Motor de detección de duplicados para clientes.
 *
 * Normaliza los campos (minúsculas, sin acentos, sin puntuación, espacios
 * colapsados) y compara con similitud difusa (Levenshtein) por campo:
 *  - RUT: exacto (excluye los RUT basura tipo "0")
 *  - Teléfono: últimos 8 dígitos
 *  - Correo: exacto
 *  - Nombre: similitud >= 0.82
 *  - Dirección: similitud >= 0.90 (más estricta)
 *  - Empresa: similitud >= 0.82 (solo si el cliente es empresa)
 */

export interface DuplicateCheckInput {
  name?: string;
  rut?: string;
  address?: string;
  phone?: string;
  email?: string;
  company_name?: string;
  has_company?: boolean;
}

export interface FieldMatch {
  field: string;
  value: string;
  similarity: number;
}

export interface DuplicateMatch {
  client: {
    id?: number;
    name: string;
    rut_raw?: string;
    address?: string;
    city?: string;
    phone?: string;
    email?: string;
    company_name?: string;
  };
  fields: FieldMatch[];
}

/** Umbrales de similitud por campo (ajustables). */
export const THRESHOLDS = {
  name: 0.82,
  address: 0.9,
  company: 0.82,
};

/** Normaliza texto para comparar: minúsculas, sin acentos/puntuación, espacios colapsados. */
export function normalize(value: string | null | undefined): string {
  return (value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Distancia de Levenshtein. */
export function levenshtein(a: string, b: string): number {
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prevDiag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, prevDiag + cost);
      prevDiag = tmp;
    }
  }
  return prev[b.length];
}

/** Similitud 0..1: 1 - dist/maxLen. */
export function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

/**
 * Similitud exacta cuando puede alcanzar `minSim`; 0 cuando es
 * matemáticamente imposible. La distancia de Levenshtein es >= a la
 * diferencia de largos, así que si 1 - |lenDiff|/maxLen < minSim ninguna
 * comparación puede superar el umbral y se ahorra la matriz O(lenA*lenB).
 * Clave para el escaneo batch de duplicados (script find-duplicate-groups).
 */
export function similarityAtLeast(a: string, b: string, minSim: number): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  if (1 - Math.abs(a.length - b.length) / maxLen < minSim) return 0;
  return similarity(a, b);
}

/** RUT "real" (no basura tipo 0/00/vacío): normalizado con >= 7 chars y no todo ceros. */
function isMeaningfulRut(rut: string): boolean {
  if (rut.length < 7) return false;
  return !/^0+$/.test(rut);
}

/**
 * Email "real": debe tener @, largo razonable y no ser basura tipo "sc"/"0".
 * En producción había 121 clientes activos con email "sc": sin este filtro,
 * un registro con esa basura dispara 121 falsos positivos.
 */
function isMeaningfulEmail(email: string): boolean {
  return email.includes('@') && email.length >= 6 && !/^\d+$/.test(email);
}

/** Últimos 8 dígitos de un teléfono. */
export function phoneKey(value: string): string {
  const digits = (value ?? '').replace(/\D/g, '');
  return digits.slice(-8);
}

/**
 * Busca clientes que coincidan con los campos del formulario.
 * Devuelve hasta `limit` coincidencias ordenadas por cantidad de campos
 * iguales y mejor similitud.
 */
export function findDuplicates(
  candidates: Array<{
    id?: number;
    name: string;
    rut_raw?: string;
    rut_normalizado?: string;
    address?: string;
    city?: string;
    phone?: string;
    email?: string;
    company_name?: string;
  }>,
  input: DuplicateCheckInput,
  limit = 6,
): DuplicateMatch[] {
  const normName = normalize(input.name);
  const normRut = normalize(input.rut);
  const normAddress = normalize(input.address);
  const normPhone = phoneKey(input.phone ?? '');
  const normEmail = (input.email ?? '').toLowerCase().trim();
  const normCompany = normalize(input.company_name);
  const companyActive = input.has_company === true && normCompany.length >= 3;
  const emailUsable = isMeaningfulEmail(normEmail);

  const results: DuplicateMatch[] = [];

  for (const c of candidates) {
    const fields: FieldMatch[] = [];

    // RUT exacto (ambos reales)
    if (isMeaningfulRut(normRut)) {
      const clientRut = normalize(c.rut_raw);
      const clientRutNorm = normalize(c.rut_normalizado);
      if (
        isMeaningfulRut(clientRut) && clientRut === normRut ||
        isMeaningfulRut(clientRutNorm) && clientRutNorm === normRut
      ) {
        fields.push({ field: 'rut', value: c.rut_raw ?? '', similarity: 1 });
      }
    }

    // Teléfono: últimos 8 dígitos
    if (normPhone.length >= 6) {
      const clientPhone = phoneKey(c.phone ?? '');
      if (clientPhone.length >= 6 && clientPhone === normPhone) {
        fields.push({ field: 'phone', value: c.phone ?? '', similarity: 1 });
      }
    }

    // Correo exacto (solo emails "reales")
    if (emailUsable && isMeaningfulEmail((c.email ?? '').toLowerCase().trim())
      && (c.email ?? '').toLowerCase().trim() === normEmail) {
      fields.push({ field: 'email', value: c.email ?? '', similarity: 1 });
    }

    // Nombre difuso
    if (normName.length >= 3) {
      const sim = similarityAtLeast(normName, normalize(c.name), THRESHOLDS.name);
      if (sim >= THRESHOLDS.name) {
        fields.push({ field: 'name', value: c.name, similarity: sim });
      }
    }

    // Dirección difusa (más estricta)
    if (normAddress.length >= 5) {
      const sim = similarityAtLeast(normAddress, normalize(c.address), THRESHOLDS.address);
      if (sim >= THRESHOLDS.address) {
        fields.push({ field: 'address', value: c.address ?? '', similarity: sim });
      }
    }

    // Empresa difusa
    if (companyActive) {
      const sim = similarityAtLeast(normCompany, normalize(c.company_name), THRESHOLDS.company);
      if (sim >= THRESHOLDS.company) {
        fields.push({ field: 'company', value: c.company_name ?? '', similarity: sim });
      }
    }

    if (fields.length > 0) {
      results.push({
        client: {
          id: c.id,
          name: c.name,
          rut_raw: c.rut_raw,
          address: c.address,
          city: c.city,
          phone: c.phone,
          email: c.email,
          company_name: c.company_name,
        },
        fields,
      });
    }
  }

  results.sort((a, b) => {
    if (b.fields.length !== a.fields.length) return b.fields.length - a.fields.length;
    const maxA = Math.max(...a.fields.map((f) => f.similarity));
    const maxB = Math.max(...b.fields.map((f) => f.similarity));
    return maxB - maxA;
  });

  return results.slice(0, limit);
}