import type { DemoState, LiveAggregate } from '../domain/types';
import { titleCase } from '../data/catalog';
import { getCurrentCampusFitCheckIns } from './activeCheckIns';
import { getVisitWorkoutFocuses } from './workoutFocus';

const crowdFromParticipation = (count: number, capacity: number): LiveAggregate['crowdLevel'] => {
  const share = count / Math.max(capacity * 0.08, 1);
  if (share < 0.35) return 'low';
  if (share < 0.7) return 'moderate';
  if (share < 1.1) return 'busy';
  return 'very_busy';
};

const aggregateCategory = (
  values: string[],
  threshold: number
): LiveAggregate['focusCounts'] => {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([key, count]) => ({ key, label: titleCase(key), count: count >= threshold ? count : undefined, suppressed: count < threshold }));
};

export const getLiveAggregate = (state: DemoState, facilityId: string): LiveAggregate => {
  const facility = state.facilities.find((item) => item.id === facilityId);
  if (!facility) throw new Error('Facility not found in tenant');
  const active = getCurrentCampusFitCheckIns(state, facilityId);
  const tracker = state.participationTrackers?.find((item) =>
    item.facilityId === facilityId &&
    Date.parse(state.now) >= Date.parse(item.intervalStart) &&
    Date.parse(state.now) < Date.parse(item.intervalEnd));
  const campusFitCheckIns = tracker?.campusFitCheckIns ?? active.length;
  return {
    facilityId,
    campusFitCheckIns,
    crowdLevel: crowdFromParticipation(campusFitCheckIns, facility.capacity),
    confidence: tracker?.confidence ?? (active.length >= 12 ? 'medium' : 'low'),
    focusCounts: aggregateCategory(active.flatMap((visit) => visit.intent === 'workout' ? getVisitWorkoutFocuses(visit) : []), state.university.privacyCountThreshold),
    activityCounts: aggregateCategory(active.flatMap((visit) => visit.activity ? [visit.activity] : []), state.university.privacyCountThreshold),
    updatedAt: tracker?.updatedAt ?? state.now,
    sourceExplanation: tracker?.sourceExplanation ?? 'Live totals count current, voluntary CampusFit check-ins only. This is not official occupancy.',
    discountedAutoClosed: state.visits.filter((visit) => visit.facilityId === facilityId && visit.status === 'auto_closed').length
  };
};
