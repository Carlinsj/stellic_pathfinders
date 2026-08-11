import { activityEquipment, focusEquipmentWeights } from '../data/catalog';
import type { DemoState, Visit } from '../domain/types';
import { addMinutes } from '../lib/format';

export const addSyntheticVisit = (state: DemoState, status: 'planned' | 'checked_in', focus: string, activity?: string): DemoState => {
  const facility = state.facilities.find((item) => !activity || item.activities.includes(activity)) ?? state.facilities[0]!;
  const index = state.visits.length;
  const arrival = status === 'planned' ? addMinutes(state.now, 30) : undefined;
  const visit: Visit = {
    id: `demo_control_${index}`,
    universityId: state.university.id,
    userId: `demo_control_user_${index}`,
    userDisplayName: 'Synthetic demo student',
    facilityId: facility.id,
    status,
    source: 'demo',
    intent: activity ? 'activity' : 'workout',
    plannedArrivalAt: arrival,
    originalPlannedArrivalAt: arrival,
    checkedInAt: status === 'checked_in' ? state.now : undefined,
    expectedDurationMinutes: 60,
    expectedEndAt: status === 'checked_in' ? addMinutes(state.now, 60) : undefined,
    autoCloseAt: status === 'checked_in' ? addMinutes(state.now, 60 + state.university.autoCloseGraceMinutes) : undefined,
    lastActivityAt: status === 'checked_in' ? state.now : undefined,
    primaryWorkoutFocus: activity ? undefined : focus,
    secondaryFocuses: [],
    activity,
    equipmentNeeds: activity ? activityEquipment[activity] ?? [] : Object.keys(focusEquipmentWeights[focus] ?? {}),
    privacyLevel: 'anonymous_aggregate',
    reliabilityWeight: 1,
    createdAt: state.now,
    updatedAt: state.now
  };
  return { ...state, visits: [...state.visits, visit] };
};

export const delayNextPlannedVisit = (state: DemoState): DemoState => {
  const target = state.visits.find((visit) => visit.status === 'planned' && visit.plannedArrivalAt);
  if (!target) return state;
  return { ...state, visits: state.visits.map((visit) => visit.id === target.id ? { ...visit, status: 'delayed', plannedArrivalAt: addMinutes(visit.plannedArrivalAt!, 20), updatedAt: state.now } : visit) };
};

export const checkOutSyntheticVisit = (state: DemoState, tenant: string): DemoState => {
  const target = state.visits.find((visit) => visit.status === 'checked_in' && visit.userId.startsWith(`${tenant}_synthetic`));
  if (!target) return state;
  return { ...state, visits: state.visits.map((visit) => visit.id === target.id ? { ...visit, status: 'completed', checkedOutAt: state.now, updatedAt: state.now } : visit) };
};

export const moveSyntheticVisit = (state: DemoState, tenant: string): DemoState => {
  const target = state.visits.find((visit) => visit.status === 'checked_in' && visit.userId.startsWith(`${tenant}_synthetic`));
  const next = target ? state.facilities[(state.facilities.findIndex((item) => item.id === target.facilityId) + 1) % state.facilities.length] : undefined;
  if (!target || !next) return state;
  return { ...state, visits: state.visits.map((visit) => visit.id === target.id ? { ...visit, facilityId: next.id, updatedAt: state.now } : visit) };
};
