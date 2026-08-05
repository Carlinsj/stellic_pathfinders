import type { Visit } from '../domain/types';

export const getRecordedVisitDurationMinutes = (visit: Visit): number | undefined => {
  if (!visit.checkedInAt || !visit.checkedOutAt) return undefined;
  const elapsed = Date.parse(visit.checkedOutAt) - Date.parse(visit.checkedInAt);
  if (!Number.isFinite(elapsed) || elapsed < 0) return undefined;
  return Math.round(elapsed / 60_000);
};
