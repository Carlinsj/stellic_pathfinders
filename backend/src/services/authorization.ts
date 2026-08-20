export type CampusFitRole =
  | 'student'
  | 'recreation_staff'
  | 'university_admin'
  | 'demo_admin'
  | 'platform_admin';

export function requireRole(
  actualRole: CampusFitRole,
  allowedRoles: CampusFitRole[],
) {
  if (!allowedRoles.includes(actualRole)) {
    throw new Error('ROLE_ACCESS_DENIED');
  }
}