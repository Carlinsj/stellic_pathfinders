import type { DemoState, LiveAggregate } from '../domain/types';
import { titleCase } from '../data/catalog';

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
  const active = state.visits.filter((visit) => visit.facilityId === facilityId && visit.status === 'checked_in');
  return {
    facilityId,
    campusFitCheckIns: active.length,
    crowdLevel: crowdFromParticipation(active.length, facility.capacity),
    confidence: active.length >= 12 ? 'medium' : 'low',
    focusCounts: aggregateCategory(active.flatMap((visit) => visit.intent === 'workout' && visit.primaryWorkoutFocus ? [visit.primaryWorkoutFocus] : []), state.university.privacyCountThreshold),
    activityCounts: aggregateCategory(active.flatMap((visit) => visit.activity ? [visit.activity] : []), state.university.privacyCountThreshold),
    updatedAt: state.now,
    sourceExplanation: 'Live CampusFit participation combined with synthetic historical patterns. This is not official occupancy.',
    discountedAutoClosed: state.visits.filter((visit) => visit.facilityId === facilityId && visit.status === 'auto_closed').length
  };
};
