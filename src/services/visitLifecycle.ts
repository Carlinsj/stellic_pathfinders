import type { DemoState, PrivacyLevel, Visit, VisitHistoryEntry, VisitIntent, VisitStatus } from '../domain/types';
import { activityEquipment } from '../data/catalog';
import { getVisitWorkoutFocuses, getWorkoutFocusEquipmentKeys, normalizeWorkoutFocuses, splitWorkoutFocuses } from './workoutFocus';

export class VisitLifecycleError extends Error {}

const allowedTransitions: Record<VisitStatus, VisitStatus[]> = {
  planned: ['delayed', 'checked_in', 'cancelled', 'expired'],
  delayed: ['checked_in', 'cancelled', 'expired'],
  checked_in: ['completed', 'auto_closed'],
  completed: [],
  cancelled: [],
  expired: [],
  auto_closed: []
};

export const canTransition = (from: VisitStatus, to: VisitStatus): boolean =>
  allowedTransitions[from].includes(to);

const addMinutes = (iso: string, minutes: number): string =>
  new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();

const statusEntry = (
  visit: Visit,
  newStatus: VisitStatus,
  reason: string,
  changedAt: string
): VisitHistoryEntry => ({
  id: `history_${visit.id}_${changedAt}`,
  visitId: visit.id,
  previousStatus: visit.status,
  newStatus,
  reason,
  changedAt
});

const transition = (visit: Visit, newStatus: VisitStatus, reason: string, now: string): { visit: Visit; entry: VisitHistoryEntry } => {
  if (!canTransition(visit.status, newStatus)) {
    throw new VisitLifecycleError(`Invalid visit transition: ${visit.status} → ${newStatus}`);
  }
  return {
    visit: { ...visit, status: newStatus, updatedAt: now },
    entry: statusEntry(visit, newStatus, reason, now)
  };
};

const ensureTenant = (state: DemoState, visit: Visit): void => {
  if (visit.universityId !== state.university.id) {
    throw new VisitLifecycleError('Cross-tenant visit access denied');
  }
};

const ensureNoActiveVisit = (state: DemoState, userId: string, exceptVisitId?: string): void => {
  const active = state.visits.some((visit) =>
    visit.universityId === state.university.id &&
    visit.userId === userId &&
    visit.id !== exceptVisitId &&
    visit.status === 'checked_in');
  if (active) throw new VisitLifecycleError('Only one active check-in is allowed');
};

export interface VisitDraft {
  facilityId: string;
  plannedArrivalAt?: string;
  intent: VisitIntent;
  workoutFocuses?: string[];
  primaryWorkoutFocus?: string;
  secondaryFocuses?: string[];
  activity?: string;
  equipmentNeeds?: string[];
  expectedDurationMinutes: number;
  privacyLevel: PrivacyLevel;
}

const workoutFocusesForDraft = (draft: VisitDraft): string[] =>
  normalizeWorkoutFocuses(draft.workoutFocuses ?? draft.primaryWorkoutFocus, draft.secondaryFocuses);

const validateVisitDraft = (state: DemoState, draft: VisitDraft): void => {
  const facility = state.facilities.find((item) => item.id === draft.facilityId);
  if (!facility) throw new VisitLifecycleError('Facility is unavailable for this university');
  if (draft.intent === 'workout' && workoutFocusesForDraft(draft).length === 0) {
    throw new VisitLifecycleError('A workout focus is required for a workout visit');
  }
  if (draft.intent === 'activity' && !draft.activity) {
    throw new VisitLifecycleError('An activity is required for an activity-only visit');
  }
  if (draft.activity && !facility.activities.includes(draft.activity)) {
    throw new VisitLifecycleError(`${facility.shortName} does not support ${draft.activity.replaceAll('_', ' ')}`);
  }
};

const equipmentNeedsForDraft = (draft: VisitDraft): string[] => [
  ...(draft.intent === 'workout' ? draft.equipmentNeeds ?? getWorkoutFocusEquipmentKeys(workoutFocusesForDraft(draft)) : []),
  ...(draft.activity ? activityEquipment[draft.activity] ?? [] : [])
];

export const createPlan = (state: DemoState, draft: VisitDraft): DemoState => {
  validateVisitDraft(state, draft);
  if (!draft.plannedArrivalAt) throw new VisitLifecycleError('A planned arrival time is required');
  const now = state.now;
  const visitFocuses = splitWorkoutFocuses(draft.intent === 'workout' ? workoutFocusesForDraft(draft) : []);
  const visit: Visit = {
    id: `visit_${state.currentUser.id}_${Date.parse(now)}_${state.visits.length}`,
    universityId: state.university.id,
    userId: state.currentUser.id,
    facilityId: draft.facilityId,
    status: 'planned',
    source: 'planned',
    intent: draft.intent,
    plannedArrivalAt: draft.plannedArrivalAt,
    originalPlannedArrivalAt: draft.plannedArrivalAt,
    expectedDurationMinutes: draft.expectedDurationMinutes,
    primaryWorkoutFocus: visitFocuses.primaryWorkoutFocus,
    secondaryFocuses: visitFocuses.secondaryFocuses,
    activity: draft.activity,
    equipmentNeeds: [...new Set(equipmentNeedsForDraft(draft))],
    privacyLevel: 'anonymous_aggregate',
    reliabilityWeight: 1,
    createdAt: now,
    updatedAt: now
  };
  return {
    ...state,
    visits: [...state.visits, visit],
    history: [...state.history, { id: `history_${visit.id}`, visitId: visit.id, newStatus: 'planned', reason: 'Plan created', changedAt: now }]
  };
};

export const spontaneousCheckIn = (state: DemoState, draft: VisitDraft): DemoState => {
  ensureNoActiveVisit(state, state.currentUser.id);
  validateVisitDraft(state, draft);
  const now = state.now;
  const expectedEndAt = addMinutes(now, draft.expectedDurationMinutes);
  const visitFocuses = splitWorkoutFocuses(draft.intent === 'workout' ? workoutFocusesForDraft(draft) : []);
  const visit: Visit = {
    id: `visit_${state.currentUser.id}_${Date.parse(now)}_${state.visits.length}`,
    universityId: state.university.id,
    userId: state.currentUser.id,
    facilityId: draft.facilityId,
    status: 'checked_in',
    source: 'spontaneous',
    intent: draft.intent,
    checkedInAt: now,
    expectedDurationMinutes: draft.expectedDurationMinutes,
    expectedEndAt,
    autoCloseAt: addMinutes(expectedEndAt, state.university.autoCloseGraceMinutes),
    lastActivityAt: now,
    primaryWorkoutFocus: visitFocuses.primaryWorkoutFocus,
    secondaryFocuses: visitFocuses.secondaryFocuses,
    activity: draft.activity,
    equipmentNeeds: [...new Set(equipmentNeedsForDraft(draft))],
    privacyLevel: 'anonymous_aggregate',
    reliabilityWeight: 1,
    createdAt: now,
    updatedAt: now
  };
  return {
    ...state,
    visits: [...state.visits, visit],
    history: [...state.history, { id: `history_${visit.id}`, visitId: visit.id, newStatus: 'checked_in', reason: 'Spontaneous check-in', changedAt: now }]
  };
};

const replaceVisit = (state: DemoState, updated: Visit, entry?: VisitHistoryEntry): DemoState => ({
  ...state,
  visits: state.visits.map((visit) => visit.id === updated.id ? updated : visit),
  history: entry ? [...state.history, entry] : state.history
});

export const checkInPlannedVisit = (state: DemoState, visitId: string): DemoState => {
  const visit = state.visits.find((item) => item.id === visitId);
  if (!visit) throw new VisitLifecycleError('Visit not found');
  ensureTenant(state, visit);
  ensureNoActiveVisit(state, visit.userId, visit.id);
  const result = transition(visit, 'checked_in', 'Student arrived', state.now);
  const expectedEndAt = addMinutes(state.now, visit.expectedDurationMinutes);
  return replaceVisit(state, {
    ...result.visit,
    checkedInAt: state.now,
    expectedEndAt,
    autoCloseAt: addMinutes(expectedEndAt, state.university.autoCloseGraceMinutes),
    lastActivityAt: state.now
  }, result.entry);
};

export const delayVisit = (state: DemoState, visitId: string, minutes: number): DemoState => {
  const visit = state.visits.find((item) => item.id === visitId);
  if (!visit?.plannedArrivalAt) throw new VisitLifecycleError('Planned visit not found');
  ensureTenant(state, visit);
  if (visit.status !== 'planned' && visit.status !== 'delayed') throw new VisitLifecycleError('Only an upcoming visit can be delayed');
  const previousTime = visit.plannedArrivalAt;
  const newTime = addMinutes(previousTime, minutes);
  const entry = visit.status === 'planned'
    ? statusEntry(visit, 'delayed', `Arrival moved from ${previousTime} to ${newTime}`, state.now)
    : undefined;
  return replaceVisit(state, { ...visit, status: 'delayed', plannedArrivalAt: newTime, updatedAt: state.now }, entry);
};

export const changeFacility = (state: DemoState, visitId: string, facilityId: string): DemoState => {
  const visit = state.visits.find((item) => item.id === visitId);
  if (!visit) throw new VisitLifecycleError('Visit not found');
  ensureTenant(state, visit);
  if (!['planned', 'delayed'].includes(visit.status)) throw new VisitLifecycleError('An active or closed visit cannot change facilities');
  const nextFacility = state.facilities.find((facility) => facility.id === facilityId);
  if (!nextFacility) throw new VisitLifecycleError('Cross-tenant facility access denied');
  if (visit.activity && !nextFacility.activities.includes(visit.activity)) throw new VisitLifecycleError(`${nextFacility.shortName} does not support ${visit.activity.replaceAll('_', ' ')}`);
  return replaceVisit(state, { ...visit, facilityId, updatedAt: state.now });
};

export const cancelVisit = (state: DemoState, visitId: string): DemoState => {
  const visit = state.visits.find((item) => item.id === visitId);
  if (!visit) throw new VisitLifecycleError('Visit not found');
  ensureTenant(state, visit);
  const result = transition(visit, 'cancelled', 'Cancelled by student', state.now);
  return replaceVisit(state, result.visit, result.entry);
};

export const checkOutVisit = (state: DemoState, visitId: string, feedback?: Visit['crowdFeedback']): DemoState => {
  const visit = state.visits.find((item) => item.id === visitId);
  if (!visit) throw new VisitLifecycleError('Visit not found');
  ensureTenant(state, visit);
  const result = transition(visit, 'completed', 'Student checked out', state.now);
  return replaceVisit(state, { ...result.visit, checkedOutAt: state.now, crowdFeedback: feedback }, result.entry);
};

export const extendVisit = (state: DemoState, visitId: string, minutes = 20): DemoState => {
  const visit = state.visits.find((item) => item.id === visitId);
  if (!visit?.expectedEndAt || visit.status !== 'checked_in') throw new VisitLifecycleError('Only an active visit can be extended');
  ensureTenant(state, visit);
  const expectedEndAt = addMinutes(visit.expectedEndAt, minutes);
  return replaceVisit(state, {
    ...visit,
    expectedEndAt,
    autoCloseAt: addMinutes(expectedEndAt, state.university.autoCloseGraceMinutes),
    lastActivityAt: state.now,
    updatedAt: state.now
  });
};

export const extendVisitUntil = (state: DemoState, visitId: string, expectedEndAt: string): DemoState => {
  const visit = state.visits.find((item) => item.id === visitId);
  if (!visit?.expectedEndAt || visit.status !== 'checked_in') throw new VisitLifecycleError('Only an active visit can be extended');
  ensureTenant(state, visit);
  if (!Number.isFinite(Date.parse(expectedEndAt)) || Date.parse(expectedEndAt) <= Date.parse(state.now)) {
    throw new VisitLifecycleError('The new finish time must be in the future');
  }
  return replaceVisit(state, {
    ...visit,
    expectedDurationMinutes: Math.max(1, Math.round((Date.parse(expectedEndAt) - Date.parse(visit.checkedInAt!)) / 60_000)),
    expectedEndAt,
    autoCloseAt: addMinutes(expectedEndAt, 30),
    lastActivityAt: state.now,
    updatedAt: state.now
  });
};

export const changeWorkoutFocuses = (state: DemoState, visitId: string, focuses: string[]): DemoState => {
  const visit = state.visits.find((item) => item.id === visitId);
  if (!visit || !['planned', 'delayed', 'checked_in'].includes(visit.status)) throw new VisitLifecycleError('Visit cannot be updated');
  ensureTenant(state, visit);
  const normalized = normalizeWorkoutFocuses(focuses);
  if (normalized.length === 0) throw new VisitLifecycleError('A workout focus is required for a workout visit');
  const nextFocuses = splitWorkoutFocuses(normalized);
  return replaceVisit(state, {
    ...visit,
    intent: 'workout',
    primaryWorkoutFocus: nextFocuses.primaryWorkoutFocus,
    secondaryFocuses: nextFocuses.secondaryFocuses,
    equipmentNeeds: [
      ...getWorkoutFocusEquipmentKeys(normalized),
      ...(visit.activity ? activityEquipment[visit.activity] ?? [] : [])
    ],
    lastActivityAt: visit.status === 'checked_in' ? state.now : visit.lastActivityAt,
    updatedAt: state.now
  });
};

export const changeWorkoutFocus = (state: DemoState, visitId: string, focus: string): DemoState =>
  changeWorkoutFocuses(state, visitId, [focus]);

export const changeActivity = (state: DemoState, visitId: string, activity?: string): DemoState => {
  const visit = state.visits.find((item) => item.id === visitId);
  if (!visit || !['planned', 'delayed', 'checked_in'].includes(visit.status)) throw new VisitLifecycleError('Visit cannot be updated');
  ensureTenant(state, visit);
  const facility = state.facilities.find((item) => item.id === visit.facilityId)!;
  if (visit.intent === 'activity' && !activity) throw new VisitLifecycleError('An activity is required for an activity-only visit');
  if (activity && !facility.activities.includes(activity)) throw new VisitLifecycleError(`${facility.shortName} does not support ${activity.replaceAll('_', ' ')}`);
  return replaceVisit(state, {
    ...visit,
    activity,
    equipmentNeeds: [
      ...(visit.intent === 'workout' ? getWorkoutFocusEquipmentKeys(getVisitWorkoutFocuses(visit)) : []),
      ...(activity ? activityEquipment[activity] ?? [] : [])
    ],
    lastActivityAt: visit.status === 'checked_in' ? state.now : visit.lastActivityAt,
    updatedAt: state.now
  });
};

export const autoCloseStaleVisits = (state: DemoState, at = state.now): DemoState => {
  const history = [...state.history];
  const visits = state.visits.map((visit) => {
    if (visit.status !== 'checked_in' || !visit.autoCloseAt || Date.parse(visit.autoCloseAt) > Date.parse(at)) return visit;
    const result = transition(visit, 'auto_closed', 'Automatic closure after reminder grace period', at);
    history.push(result.entry);
    return { ...result.visit, checkedOutAt: at, reliabilityWeight: 0.35 };
  });
  return { ...state, visits, history };
};

export const expirePastPlans = (state: DemoState, at = state.now): DemoState => {
  const expiryCutoff = Date.parse(at) - 90 * 60_000;
  return {
    ...state,
    visits: state.visits.map((visit) => {
      if (!['planned', 'delayed'].includes(visit.status) || !visit.plannedArrivalAt || Date.parse(visit.plannedArrivalAt) >= expiryCutoff) return visit;
      return { ...visit, status: 'expired' as const, updatedAt: at };
    })
  };
};
