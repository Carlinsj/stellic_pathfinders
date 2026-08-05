import type { Visit } from '../domain/types';

export type ActiveVisitTiming = 'on_time' | 'grace_period' | 'auto_close_due';

export const getActiveVisitTiming = (visit: Visit, at: string): ActiveVisitTiming => {
  if (visit.status !== 'checked_in' || !visit.expectedEndAt) return 'on_time';
  if (visit.autoCloseAt && Date.parse(at) >= Date.parse(visit.autoCloseAt)) return 'auto_close_due';
  if (Date.parse(at) >= Date.parse(visit.expectedEndAt)) return 'grace_period';
  return 'on_time';
};

export const graceMinutesRemaining = (visit: Visit, at: string): number =>
  visit.autoCloseAt ? Math.max(0, Math.ceil((Date.parse(visit.autoCloseAt) - Date.parse(at)) / 60_000)) : 0;
