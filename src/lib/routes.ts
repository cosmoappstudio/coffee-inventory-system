import type { Role } from '../types';

export function getDefaultPathForRole(role: Role): string {
  if (role === 'Owner') return '/admin/dashboard';
  return '/ops/usage';
}

/** Admin panel is Owner-only. */
export function getAdminLandingPath(role: Role): string {
  if (role === 'Owner') return '/admin/dashboard';
  return '/ops/transfers';
}
