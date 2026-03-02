// lib/auth/identity.ts
import type { Company } from '../../types/entry';

export function normalizeName(input: string) {
  return input.trim().replace(/\s+/g, ' ');
}

export function normalizePhone(input: string) {
  return input.replace(/\D/g, '');
}

export function isValidPhone(phoneNormalized: string) {
  return phoneNormalized.length === 10 || phoneNormalized.length === 11;
}

export function buildNameIndexId(company: Company, name: string) {
  const n = normalizeName(name).toLowerCase();
  return `${company}__${n}`;
}

export function makeInternalEmail(company: Company, phoneNormalized: string) {
  // 이메일은 실제 존재하지 않아도 Firebase Auth는 동작합니다(내부용).
  const prefix = company === 'GOMOTECH' ? 'gomotec' : 'dxsolution';
  return `${prefix}.${phoneNormalized}@internal.local`;
}