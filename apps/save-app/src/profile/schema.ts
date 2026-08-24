import type { AuthUser } from '@/auth/types';
import { parseCatalogItem } from '@/catalog/schema';
import type { CatalogItem } from '@/catalog/types';

function protocolError(field: string): never {
  throw new Error(`Invalid profile response: ${field}`);
}

function record(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    protocolError(field);
  }
  return value as Record<string, unknown>;
}

function nonBlankString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    protocolError(field);
  }
  return value;
}

function nullableString(value: unknown, field: string): string | null {
  if (value === null) return null;
  return typeof value === 'string' ? value : protocolError(field);
}

function positiveInteger(value: unknown, field: string): number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
    ? value
    : protocolError(field);
}

function nullablePositiveInteger(value: unknown, field: string): number | null {
  return value === null ? null : positiveInteger(value, field);
}

function userRole(value: unknown): AuthUser['role'] {
  return value === 'USER' || value === 'ADMIN'
    ? value
    : protocolError('role');
}

export function parseMyProfile(value: unknown): AuthUser {
  const user = record(value, 'profile');
  return {
    id: positiveInteger(user.id, 'id'),
    email: nonBlankString(user.email, 'email'),
    name: nonBlankString(user.name, 'name'),
    department: nullableString(user.department, 'department'),
    universityId: nullablePositiveInteger(user.university_id, 'university_id'),
    universityName: nullableString(user.university_name, 'university_name'),
    profileImageUrl: nullableString(user.profile_image_url, 'profile_image_url'),
    role: userRole(user.role),
  };
}

export function parseCatalogItemList(value: unknown, label: string): CatalogItem[] {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid ${label} response`);
  }
  return value.map(parseCatalogItem);
}
