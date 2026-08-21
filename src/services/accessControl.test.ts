import { describe, expect, it } from 'vitest';
import { canAccessArea, defaultRouteForRole, isStaffPortalRole, resolveTenantSignInAccount } from './accessControl';
import type { UserProfile } from '../domain/types';

const profile = (id: string, universityId: string): UserProfile => ({
  id,
  universityId,
  fullName: 'Maya Chen',
  email: 'maya.chen@nyu.edu',
  role: 'student',
  defaultPrivacyLevel: 'anonymous_aggregate',
});

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

  it('accepts an API account returned for the tenant despite differing university ID formats', () => {
    const apiAccount = profile('profile-uuid', 'university-uuid');

    expect(resolveTenantSignInAccount(apiAccount, [apiAccount], 'uni_nyu')).toEqual({
      ...apiAccount,
      universityId: 'uni_nyu',
    });
  });

  it('rejects an account that was not returned for the requested tenant', () => {
    const selected = profile('other-profile', 'other-university');
    const nyuAccount = profile('nyu-profile', 'nyu-university-uuid');

    expect(() => resolveTenantSignInAccount(selected, [nyuAccount], 'uni_nyu'))
      .toThrow('Cross-tenant sign-in denied');
  });
});
