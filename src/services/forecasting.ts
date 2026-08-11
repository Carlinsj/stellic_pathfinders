import type { CrowdLevel, DemoState, Facility, Forecast } from '../domain/types';

const addMinutes = (iso: string, minutes: number): string =>
  new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();

export const isSpecialClosureActive = (facility: Facility, at: string): boolean => {
  const special = facility.specialClosure;
  return Boolean(special && Date.parse(at) >= Date.parse(special.startsAt) && Date.parse(at) <= Date.parse(special.endsAt));
};

export const isFacilityOpen = (facility: Facility, at: string): boolean => {
  const date = new Date(at);
  if (isSpecialClosureActive(facility, at)) return false;
  const hours = facility.hours.find((entry) => entry.weekday === date.getDay());
  if (!hours || hours.closureReason) return false;
  const minutes = date.getHours() * 60 + date.getMinutes();
  const [openHour = 0, openMinute = 0] = hours.openingTime.split(':').map(Number);
  const [closeHour = 0, closeMinute = 0] = hours.closingTime.split(':').map(Number);
  return minutes >= openHour * 60 + openMinute && minutes < closeHour * 60 + closeMinute;
};

const crowdLevel = (ratio: number): CrowdLevel => {
  if (!Number.isFinite(ratio)) return 'unknown';
  if (ratio < 0.35) return 'low';
  if (ratio < 0.6) return 'moderate';
  if (ratio < 0.82) return 'busy';
  return 'very_busy';
};

const overlaps = (start: string | undefined, durationMinutes: number, intervalStart: string, intervalEnd: string): boolean => {
  if (!start) return false;
  const visitStart = Date.parse(start);
  const visitEnd = visitStart + durationMinutes * 60_000;
  return visitStart < Date.parse(intervalEnd) && visitEnd > Date.parse(intervalStart);
};

export const approximateExpectedVisitors = (forecast: Pick<Forecast, 'expectedRange'>): number => {
  const midpoint = (forecast.expectedRange[0] + forecast.expectedRange[1]) / 2;
  const roundingStep = midpoint >= 100 ? 10 : 5;
  return Math.round(midpoint / roundingStep) * roundingStep;
};

export const forecastDemand = (state: DemoState, facilityId: string, at = state.now): Forecast => {
  const facility = state.facilities.find((item) => item.id === facilityId);
  if (!facility) throw new Error('Facility not found in tenant');
  const intervalStart = at;
  const intervalEnd = addMinutes(at, 30);
  if (!isFacilityOpen(facility, at)) {
    return { facilityId, intervalStart, intervalEnd, expectedRange: [0, 0], crowdLevel: 'unknown', confidence: 'high', sourceExplanation: 'Facility is closed during this interval.', drivers: ['Facility closure'], plannedCount: 0 };
  }
  const hour = new Date(at).getHours();
  const historicalRatio = facility.baselineByHour[hour] ?? 0.36;
  const planned = state.visits.filter((visit) =>
    visit.facilityId === facilityId &&
    ['planned', 'delayed'].includes(visit.status) &&
    overlaps(visit.plannedArrivalAt, visit.expectedDurationMinutes, intervalStart, intervalEnd));
  const active = state.visits.filter((visit) =>
    visit.facilityId === facilityId && visit.status === 'checked_in' &&
    overlaps(visit.checkedInAt, visit.expectedDurationMinutes, intervalStart, intervalEnd));
  const reliableHistorical = state.visits.filter((visit) =>
    visit.facilityId === facilityId && ['completed', 'auto_closed'].includes(visit.status))
    .reduce((sum, visit) => sum + visit.reliabilityWeight, 0);
  const expected = historicalRatio * facility.capacity + planned.length * 0.7 + active.length * 0.35;
  const uncertainty = reliableHistorical > 25 ? 0.1 : 0.18;
  const low = Math.max(active.length, Math.round(expected * (1 - uncertainty)));
  const high = Math.min(facility.capacity, Math.round(expected * (1 + uncertainty)));
  const drivers = [
    historicalRatio >= 0.7 ? 'Typical after-class peak' : 'Historical pattern for this time',
    planned.length > 4 ? `${planned.length} declared future visits` : 'Limited declared plans',
    active.length > 8 ? 'Current CampusFit participation' : 'Live participation is a smaller signal'
  ];
  return {
    facilityId,
    intervalStart,
    intervalEnd,
    expectedRange: [low, high],
    crowdLevel: crowdLevel(((low + high) / 2) / facility.capacity),
    confidence: reliableHistorical > 60 && planned.length >= 3 ? 'medium' : 'low',
    sourceExplanation: 'Synthetic historical patterns, declared plans, active CampusFit check-ins, hours, and capacity. No official occupancy feed is connected.',
    drivers,
    plannedCount: planned.length
  };
};
