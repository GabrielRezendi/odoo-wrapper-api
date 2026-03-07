/**
 * Merges extra Odoo properties into a base object.
 * Used for both body.odoo and query param odoo (parsed from JSON).
 * Sanitizes odoo to prevent prototype pollution.
 */
export function mergeOdoo<T extends Record<string, unknown>>(
  base: T,
  odoo?: Record<string, unknown> | null,
): T {
  if (!odoo || typeof odoo !== 'object' || Array.isArray(odoo)) {
    return base;
  }
  const sanitized = sanitizeOdooObject(odoo);
  return { ...base, ...sanitized } as T;
}

const PROTO_POLLUTION_KEYS = ['__proto__', 'constructor', 'prototype'];

function sanitizeOdooObject(
  obj: Record<string, unknown>,
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (PROTO_POLLUTION_KEYS.includes(k)) continue;
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      sanitized[k] = sanitizeOdooObject(v as Record<string, unknown>);
    } else {
      sanitized[k] = v;
    }
  }
  return sanitized;
}

/**
 * Parses the odoo query param (JSON string) into an object.
 * Sanitizes against prototype pollution.
 */
export function parseOdooQuery(
  odooStr?: string | null,
): Record<string, unknown> | undefined {
  if (!odooStr || typeof odooStr !== 'string') return undefined;
  try {
    const parsed = JSON.parse(odooStr) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
      return undefined;
    return sanitizeOdooObject(parsed as Record<string, unknown>);
  } catch {
    return undefined;
  }
}
