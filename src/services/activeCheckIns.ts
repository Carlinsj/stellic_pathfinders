import type { DemoState, Visit } from '../domain/types';

const isSyntheticVisit = (visit: Visit): boolean =>
  visit.source === 'demo' || visit.userId.includes('_synthetic_');

const activeUntil = (visit: Visit, graceMinutes: number): number | undefined => {
  const explicitAutoClose = visit.autoCloseAt ? Date.parse(visit.autoCloseAt) : Number.NaN;
  if (Number.isFinite(explicitAutoClose)) return explicitAutoClose;

  const expectedEnd = visit.expectedEndAt ? Date.parse(visit.expectedEndAt) : Number.NaN;
  if (Number.isFinite(expectedEnd)) return expectedEnd + graceMinutes * 60_000;

  const checkedIn = visit.checkedInAt ? Date.parse(visit.checkedInAt) : Number.NaN;
  if (Number.isFinite(checkedIn)) {
    return checkedIn + (visit.expectedDurationMinutes + graceMinutes) * 60_000;
  }

  return undefined;
};

export const isCurrentCampusFitCheckIn = (
  visit: Visit,
  at: string,
  graceMinutes: number,
): boolean => {
  if (visit.status !== 'checked_in' || isSyntheticVisit(visit)) return false;
  const closesAt = activeUntil(visit, graceMinutes);
  return closesAt !== undefined && closesAt > Date.parse(at);
};

export const getCurrentCampusFitCheckIns = (
  state: DemoState,
  facilityId: string,
  at = state.now,
): Visit[] => state.visits.filter((visit) =>
  visit.universityId === state.university.id &&
  visit.facilityId === facilityId &&
  isCurrentCampusFitCheckIn(visit, at, state.university.autoCloseGraceMinutes));
