import type { Role, UserProfile } from '../domain/types';

export type AccessArea = 'student' | 'staff' | 'admin' | 'demo';

const accessByRole: Record<Role, readonly AccessArea[]> = {
  student: ['student'],
  recreation_staff: ['staff'],
  university_admin: ['staff', 'admin', 'demo'],
  demo_admin: ['demo'],
  platform_admin: ['staff', 'admin', 'demo']
};

export const roleLabels: Record<Role, string> = {
  student: 'Student',
  recreation_staff: 'Recreation staff',
  university_admin: 'University administrator',
  demo_admin: 'Demo administrator',
  platform_admin: 'Platform administrator'
};

export const canAccessArea = (role: Role, area: AccessArea): boolean =>
  accessByRole[role].includes(area);

export const isStudentRole = (role: Role): boolean => role === 'student';

export const isStaffPortalRole = (role: Role): boolean => role !== 'student';

export const defaultRouteForRole = (role: Role): string => {
  if (role === 'student') return 'home';
  if (role === 'recreation_staff') return 'staff';
  if (role === 'demo_admin') return 'demo';
  return 'admin';
};

export const resolveTenantSignInAccount = (
  selectedAccount: UserProfile,
  tenantAccounts: readonly UserProfile[],
  activeUniversityId: string,
): UserProfile => {
  const tenantAccount = tenantAccounts.find((account) =>
    account.id === selectedAccount.id &&
    account.universityId === selectedAccount.universityId
  );
  if (!tenantAccount) throw new Error('Cross-tenant sign-in denied');

  // API-backed profiles use the database university UUID while the optimistic
  // local repository uses its deterministic university ID. Membership in the
  // tenant-scoped account response is the client-side boundary; the API repeats
  // the authoritative university check when it creates the session.
  return { ...tenantAccount, universityId: activeUniversityId };
};
