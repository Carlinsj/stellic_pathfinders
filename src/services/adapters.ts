import type { LiveAggregate, TenantSlug, UserProfile } from '../domain/types';

export interface AuthenticationAdapter {
  signInDemo(tenant: TenantSlug, userId: string): Promise<UserProfile>;
  signOut(): Promise<void>;
  getSession(): Promise<UserProfile | null>;
  readonly mode: 'demo' | 'oidc' | 'saml';
}

export interface NotificationAdapter {
  scheduleVisitReminder(visitId: string, sendAt: string, wording: string): Promise<void>;
  cancelVisitReminder(visitId: string): Promise<void>;
}

export interface OccupancySourceAdapter {
  readonly sourceType: 'student_check_ins' | 'recreation_system' | 'entrance_counter' | 'staff_update' | 'synthetic_demo';
  getAggregate(facilityId: string): Promise<LiveAggregate | null>;
  isAuthoritative(): boolean;
}

export interface VisitVerificationAdapter {
  readonly type: 'manual' | 'qr' | 'geofence' | 'card_swipe';
  verify(facilityId: string, userId: string): Promise<{ valid: boolean; reason: string }>;
}

export const localNotificationAdapter: NotificationAdapter = {
  async scheduleVisitReminder() { return Promise.resolve(); },
  async cancelVisitReminder() { return Promise.resolve(); }
};

export const manualVisitVerification: VisitVerificationAdapter = {
  type: 'manual',
  async verify() { return { valid: true, reason: 'Manual facility selection accepted for demonstration.' }; }
};
