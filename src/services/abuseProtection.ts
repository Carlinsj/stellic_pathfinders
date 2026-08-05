import type { DemoState, Visit } from '../domain/types';

export interface AbuseAssessment {
  allowed: boolean;
  flags: string[];
  retryAfterSeconds?: number;
}

const withinMinutes = (iso: string, at: string, minutes: number): boolean =>
  Date.parse(iso) >= Date.parse(at) - minutes * 60_000;

export const assessVisitMutation = (
  state: DemoState,
  userId: string,
  action: 'check_in' | 'check_out' | 'switch_facility',
  at = state.now
): AbuseAssessment => {
  const userVisits = state.visits.filter((visit) => visit.userId === userId);
  const flags: string[] = [];
  if (action === 'check_in' && userVisits.some((visit) => visit.status === 'checked_in')) {
    return { allowed: false, flags: ['active_visit_exists'] };
  }
  const rapidClosures = userVisits.filter((visit) =>
    ['completed', 'auto_closed'].includes(visit.status) && visit.checkedOutAt && withinMinutes(visit.checkedOutAt, at, 5));
  if (action === 'check_in' && rapidClosures.length >= 2) flags.push('rapid_check_in_cycle');
  const recentMutations = state.history.filter((entry) => {
    const visit = userVisits.find((item) => item.id === entry.visitId);
    return Boolean(visit && withinMinutes(entry.changedAt, at, 10));
  });
  if (recentMutations.length >= 8) flags.push('high_mutation_rate');
  if (action === 'switch_facility' && recentMutations.filter((entry) => entry.reason.includes('facility')).length >= 3) flags.push('facility_switch_rate');
  return { allowed: flags.length === 0, flags, retryAfterSeconds: flags.length ? 300 : undefined };
};

export const reportTrustWeight = (reports: Array<{ accurate: boolean; expiresAt: string }>, at: string): number => {
  const current = reports.filter((report) => Date.parse(report.expiresAt) >= Date.parse(at));
  if (current.length === 0) return 1;
  const accuracy = current.filter((report) => report.accurate).length / current.length;
  return Math.max(0.2, Math.round(accuracy * 100) / 100);
};

export const activeVisitsForUser = (visits: Visit[], userId: string): Visit[] =>
  visits.filter((visit) => visit.userId === userId && visit.status === 'checked_in');
