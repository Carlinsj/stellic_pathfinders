import type { DemoState, FacilityParticipationTracker, Visit } from '../domain/types';

const WINDOW_MINUTES = 30;

const addMinutes = (iso: string, minutes: number): string =>
  new Date(Date.parse(iso) + minutes * 60_000).toISOString();

const arrivesInWindow = (visit: Visit, intervalStart: string, intervalEnd: string): boolean => {
  if (!visit.plannedArrivalAt) return false;
  const arrival = Date.parse(visit.plannedArrivalAt);
  return arrival >= Date.parse(intervalStart) && arrival < Date.parse(intervalEnd);
};

export const getFacilityParticipationTracker = (
  state: DemoState,
  facilityId: string,
  at = state.now
): FacilityParticipationTracker => {
  const facility = state.facilities.find((item) => item.id === facilityId);
  if (!facility) throw new Error('Facility not found in tenant');

  const intervalStart = at;
  const intervalEnd = addMinutes(at, WINDOW_MINUTES);
  const active = state.visits.filter((visit) =>
    visit.universityId === state.university.id &&
    visit.facilityId === facilityId &&
    visit.status === 'checked_in');
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
