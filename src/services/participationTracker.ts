import type { DemoState, FacilityParticipationTracker, Visit } from '../domain/types';
import { getCurrentCampusFitCheckIns } from './activeCheckIns';

const WINDOW_MINUTES = 30;

const addMinutes = (iso: string, minutes: number): string =>
  new Date(Date.parse(iso) + minutes * 60_000).toISOString();

const arrivesInWindow = (visit: Visit, intervalStart: string, intervalEnd: string): boolean => {
  if (!visit.plannedArrivalAt) return false;
  const arrival = Date.parse(visit.plannedArrivalAt);
  return arrival >= Date.parse(intervalStart) && arrival < Date.parse(intervalEnd);
};

const cachedTrackerFor = (
  state: DemoState,
  facilityId: string,
  at: string
): FacilityParticipationTracker | undefined => {
  const requestedAt = Date.parse(at);
  return state.participationTrackers?.find((tracker) =>
    tracker.universityId === state.university.id &&
    tracker.facilityId === facilityId &&
    requestedAt >= Date.parse(tracker.intervalStart) &&
    requestedAt < Date.parse(tracker.intervalEnd));
};

const trackerWindowsOverlap = (
  first: FacilityParticipationTracker,
  second: FacilityParticipationTracker
): boolean =>
  first.universityId === second.universityId &&
  first.facilityId === second.facilityId &&
  Date.parse(first.intervalStart) < Date.parse(second.intervalEnd) &&
  Date.parse(first.intervalEnd) > Date.parse(second.intervalStart);

export const mergeFacilityParticipationTrackers = (
  existing: readonly FacilityParticipationTracker[],
  incoming: readonly FacilityParticipationTracker[]
): FacilityParticipationTracker[] => incoming.reduce<FacilityParticipationTracker[]>(
  (merged, tracker) => [...merged.filter((item) => !trackerWindowsOverlap(item, tracker)), tracker],
  [...existing]
);

export const getFacilityParticipationTracker = (
  state: DemoState,
  facilityId: string,
  at = state.now
): FacilityParticipationTracker => {
  const facility = state.facilities.find((item) => item.id === facilityId);
  if (!facility) throw new Error('Facility not found in tenant');

  const cached = cachedTrackerFor(state, facilityId, at);
  if (cached) return cached;

  const intervalStart = at;
  const intervalEnd = addMinutes(at, WINDOW_MINUTES);
  const active = getCurrentCampusFitCheckIns(state, facilityId, at);
  const plannedCheckIns = active.filter((visit) => visit.source === 'planned').length;
  const scheduledNotCheckedIn = state.visits.filter((visit) =>
    visit.universityId === state.university.id &&
    visit.facilityId === facilityId &&
    (visit.status === 'planned' || visit.status === 'delayed') &&
    arrivesInWindow(visit, intervalStart, intervalEnd)).length;

  const hour = new Date(at).getHours();
  const typicalMidpoint = Math.round((facility.baselineByHour[hour] ?? 0.36) * facility.capacity);
  const historicalSampleWeight = state.visits
    .filter((visit) =>
      visit.universityId === state.university.id &&
      visit.facilityId === facilityId &&
      (visit.status === 'completed' || visit.status === 'auto_closed') &&
      visit.checkedInAt &&
      new Date(visit.checkedInAt).getHours() === hour)
    .reduce((sum, visit) => sum + visit.reliabilityWeight, 0);
  const uncertainty = historicalSampleWeight >= 8 ? 0.12 : 0.2;
  const typicalVisitorRange: [number, number] = [
    Math.max(0, Math.round(typicalMidpoint * (1 - uncertainty))),
    Math.min(facility.capacity, Math.round(typicalMidpoint * (1 + uncertainty)))
  ];

  return {
    universityId: state.university.id,
    facilityId,
    intervalStart,
    intervalEnd,
    campusFitCheckIns: active.length,
    plannedCheckIns,
    walkInCheckIns: active.length - plannedCheckIns,
    scheduledForWindow: scheduledNotCheckedIn,
    scheduledNotCheckedIn,
    typicalVisitorRange,
    confidence: historicalSampleWeight >= 8 ? 'medium' : 'low',
    updatedAt: state.now,
    sourceExplanation: 'Live totals use voluntary CampusFit check-ins. The typical range uses synthetic historical patterns for this facility and time. No official occupancy feed is connected.',
    officialOccupancyConnected: false
  };
};
