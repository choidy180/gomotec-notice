// lib/utils/stripUndefined.ts
export function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  (Object.keys(obj) as Array<keyof T>).forEach((k) => {
    const v = obj[k];
    if (v !== undefined) out[k] = v;
  });
  return out;
}