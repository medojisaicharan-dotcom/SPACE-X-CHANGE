import type { Profile, Role } from '@/types';

export function roleHome(role: Role | undefined | null): string {
  switch (role) {
    case 'administrator':
    case 'institution_manager':
      return '/admin';
    case 'resource_owner':
      return '/owner';
    default:
      return '/dashboard';
  }
}

export function isOwnerLike(profile: Profile | null): boolean {
  return Boolean(
    profile && ['resource_owner', 'administrator', 'institution_manager'].includes(profile.role),
  );
}

export function isAdminLike(profile: Profile | null): boolean {
  return Boolean(profile && ['administrator', 'institution_manager'].includes(profile.role));
}
