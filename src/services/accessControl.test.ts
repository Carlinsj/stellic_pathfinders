import { describe, expect, it } from 'vitest';
import { canAccessArea, defaultRouteForRole, isStaffPortalRole } from './accessControl';

describe('role access control', () => {
  it('keeps student and staff areas separate', () => {
    expect(canAccessArea('student', 'student')).toBe(true);
    expect(canAccessArea('student', 'staff')).toBe(false);
    expect(canAccessArea('recreation_staff', 'student')).toBe(false);
    expect(canAccessArea('recreation_staff', 'staff')).toBe(true);
  });

  it('limits elevated administration routes by role', () => {
    expect(canAccessArea('recreation_staff', 'admin')).toBe(false);
    expect(canAccessArea('university_admin', 'admin')).toBe(true);
    expect(canAccessArea('university_admin', 'demo')).toBe(true);
    expect(canAccessArea('demo_admin', 'staff')).toBe(false);
    expect(canAccessArea('demo_admin', 'demo')).toBe(true);
  });

  it('chooses a portal-specific landing route', () => {
    expect(defaultRouteForRole('student')).toBe('home');
    expect(defaultRouteForRole('recreation_staff')).toBe('staff');
    expect(defaultRouteForRole('university_admin')).toBe('admin');
    expect(isStaffPortalRole('student')).toBe(false);
    expect(isStaffPortalRole('recreation_staff')).toBe(true);
  });
});
