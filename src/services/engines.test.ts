import { describe, expect, it } from 'vitest';
import { createDemoState } from '../data/seed';
import { addMinutes } from '../lib/format';
import { assessVisitMutation, reportTrustWeight } from './abuseProtection';
import { estimateWorkoutDuration } from './durationEstimator';
import { calculateEquipmentDemand } from './equipmentDemand';
import { forecastDemand, isFacilityOpen } from './forecasting';
import { getLiveAggregate } from './liveAggregation';
import { compareRecommendations, findBetterRecommendationWindow, getRecommendationGuidance, recommendFacilities } from './recommendation';
import { spontaneousCheckIn } from './visitLifecycle';
import { getActiveVisitTiming, graceMinutesRemaining } from './visitReminders';

describe('deterministic demand engines', () => {
  it('matches the official NYU recreation activity catalog by facility', () => {
    const state = createDemoState('nyu');
    const activitiesByFacility = Object.fromEntries(state.facilities.map((facility) => [facility.id, facility.activities]));
    expect(activitiesByFacility).toEqual({
      nyu_palladium: ['swimming', 'basketball', 'volleyball', 'climbing', 'cycling', 'group_fitness'],
      nyu_paulson: ['swimming', 'basketball', 'volleyball', 'badminton', 'pickleball', 'squash', 'indoor_track', 'group_fitness'],
      nyu_404: ['group_fitness', 'cycling', 'functional_training'],
      nyu_brooklyn: ['basketball', 'volleyball', 'badminton', 'futsal', 'table_tennis', 'cricket', 'group_fitness']
    });
  });

  it('gates NYU activity-only recommendations to facilities with the verified resource', () => {
    const state = createDemoState('nyu');
    const eligibleFor = (activity: string) => recommendFacilities(state, state.now, undefined, activity, 50)
      .filter((item) => item.eligible)
      .map((item) => item.facility.id)
      .sort();
    expect(eligibleFor('climbing')).toEqual(['nyu_palladium']);
    expect(eligibleFor('pickleball')).toEqual(['nyu_paulson']);
    expect(eligibleFor('functional_training')).toEqual(['nyu_404']);
    expect(eligibleFor('table_tennis')).toEqual(['nyu_brooklyn']);
    expect(eligibleFor('squash')).toEqual(['nyu_paulson']);
  });

  it('uses published NYU quantities when the facility page provides them', () => {
    const state = createDemoState('nyu');
    const quantity = (facilityId: string, equipmentTypeId: string) => state.facilityEquipment
      .find((item) => item.facilityId === facilityId && item.equipmentTypeId === equipmentTypeId)?.totalQuantity;
    expect(quantity('nyu_palladium', 'pool_lane')).toBe(8);
    expect(quantity('nyu_palladium', 'climbing_wall')).toBe(5);
    expect(quantity('nyu_paulson', 'pool_lane')).toBe(6);
    expect(quantity('nyu_paulson', 'basketball_court')).toBe(4);
    expect(quantity('nyu_paulson', 'squash_court')).toBe(2);
    expect(quantity('nyu_404', 'studio')).toBe(2);
    expect(quantity('nyu_brooklyn', 'basketball_court')).toBe(1);
  });

  it('returns demand ranges without fake precision', () => {
    const state = createDemoState('nyu');
    const result = forecastDemand(state, 'nyu_palladium', state.now);
    expect(result.expectedRange[1]).toBeGreaterThan(result.expectedRange[0]);
    expect(result.sourceExplanation).toContain('No official occupancy feed');
    expect(result.crowdLevel).not.toBe('unknown');
  });

  it('excludes expired plans from planned demand', () => {
    const state = createDemoState('nyu');
    const baseline = forecastDemand(state, 'nyu_palladium', state.now).plannedCount;
    const plan = state.visits.find((visit) => visit.facilityId === 'nyu_palladium' && visit.status === 'planned')!;
    const changed = { ...state, visits: state.visits.map((visit) => visit.id === plan.id ? { ...visit, status: 'expired' as const } : visit) };
    expect(forecastDemand(changed, 'nyu_palladium', state.now).plannedCount).toBeLessThan(baseline);
  });

  it('equipment outages increase queues or keep them at maximum pressure', () => {
    const state = createDemoState('nyu');
    const before = calculateEquipmentDemand(state, 'nyu_palladium', state.now, 'back').find((item) => item.equipmentTypeId === 'cable')!;
    const outage = { ...state, facilityEquipment: state.facilityEquipment.map((item) => item.facilityId === 'nyu_palladium' && item.equipmentTypeId === 'cable' ? { ...item, operationalQuantity: 0 } : item) };
    const after = calculateEquipmentDemand(outage, 'nyu_palladium', state.now, 'back').find((item) => item.equipmentTypeId === 'cable')!;
    expect(after.queueRange[0]).toBeGreaterThan(before.queueRange[0]);
    expect(after.demandLevel).toBe('very_high');
  });

  it('estimates workout duration from equipment-specific waits', () => {
    const state = createDemoState('nyu');
    const pressured = { ...state, facilityEquipment: state.facilityEquipment.map((item) => item.facilityId === 'nyu_palladium' && item.equipmentTypeId === 'cable' ? { ...item, operationalQuantity: 0 } : item) };
    const demand = calculateEquipmentDemand(pressured, 'nyu_palladium', state.now, 'back').filter((item) => ['cable', 'pull_up', 'row_machine'].includes(item.equipmentTypeId));
    const estimate = estimateWorkoutDuration(50, demand);
    expect(estimate.durationRange[0]).toBeGreaterThanOrEqual(50);
    expect(estimate.durationRange[1]).toBeGreaterThan(estimate.durationRange[0]);
    expect(estimate.delayCauses.length).toBeGreaterThan(0);
  });

  it('combines equipment demand for multi-muscle recommendations', () => {
    const state = createDemoState('nyu');
    const result = recommendFacilities(state, state.now, ['chest', 'legs'], undefined, 60)
      .find((item) => item.eligible)!;
    const equipment = result.equipmentDemand.map((item) => item.equipmentTypeId);
    expect(equipment).toEqual(expect.arrayContaining(['cable', 'squat_rack']));
  });

  it('aggregates every selected muscle group without exposing individual visits', () => {
    const initial = createDemoState('nyu');
    const checkedIn = spontaneousCheckIn(initial, {
      facilityId: 'nyu_palladium',
      intent: 'workout',
      workoutFocuses: ['chest', 'legs'],
      expectedDurationMinutes: 60,
      privacyLevel: 'anonymous_aggregate'
    });
    const aggregate = getLiveAggregate(checkedIn, 'nyu_palladium');
    expect(aggregate.focusCounts.map((item) => item.key)).toEqual(expect.arrayContaining(['chest', 'legs']));
  });

  it('never recommends a facility lacking an essential activity', () => {
    const state = createDemoState('nyu');
    const results = recommendFacilities(state, state.now, undefined, 'badminton', 60);
    expect(results.filter((item) => !item.facility.activities.includes('badminton')).every((item) => !item.eligible)).toBe(true);
    expect(results.flatMap((item) => item.equipmentDemand).every((item) => item.equipmentTypeId === 'badminton_court')).toBe(true);
  });

  it('keeps activity-only participation out of workout-focus aggregates', () => {
    const state = createDemoState('nyu');
    const before = getLiveAggregate(state, 'nyu_palladium');
    const checkedIn = spontaneousCheckIn(state, { facilityId: 'nyu_palladium', intent: 'activity', activity: 'swimming', expectedDurationMinutes: 45, privacyLevel: 'anonymous_aggregate' });
    const after = getLiveAggregate(checkedIn, 'nyu_palladium');
    expect(after.campusFitCheckIns).toBe(before.campusFitCheckIns + 1);
    expect(after.focusCounts).toEqual(before.focusCounts);
  });

  it('labels a busy, low-scoring winner as best available instead of a strong recommendation', () => {
    const state = createDemoState('nyu');
    const current = recommendFacilities(state, state.now, 'back', undefined, 50).find((item) => item.eligible)!;
    const guidance = getRecommendationGuidance(current);
    expect(current.forecast.crowdLevel).toBe('busy');
    expect(guidance.verdict).toBe('wait_recommended');
    expect(guidance.label).toContain('still busy');
  });

  it('finds a meaningfully better later window with an explainable time-saving range', () => {
    const state = createDemoState('nyu');
    const current = recommendFacilities(state, state.now, 'back', undefined, 50).find((item) => item.eligible)!;
    const later = findBetterRecommendationWindow(state, state.now, 'back', undefined, 50, [], current);
    expect(later).toBeDefined();
    expect(later!.recommendation.score).toBeGreaterThanOrEqual(current.score + 8);
    expect(later!.minutesSavedRange[1]).toBeGreaterThanOrEqual(later!.minutesSavedRange[0]);
  });

  it('explains why a busier gym can rank above a calmer alternative', () => {
    const state = createDemoState('nyu');
    const recommendations = recommendFacilities(state, state.now, 'back', undefined, 50);
    const recommended = recommendations.find((item) => item.eligible)!;
    const calmer = recommendations.find((item) => item.eligible && item.forecast.crowdLevel === 'moderate')!;
    const comparison = compareRecommendations(recommended, calmer);
    expect(comparison.summary).toContain('less busy overall');
    expect(comparison.factors.join(' ')).toContain('Workout-specific wait');
    expect(comparison.factors.join(' ')).toContain('Travel');
  });

  it('includes every active visit in anonymous CampusFit aggregates', () => {
    const state = createDemoState('nyu');
    const before = getLiveAggregate(state, 'nyu_palladium');
    const checkedIn = spontaneousCheckIn(state, { facilityId: 'nyu_palladium', intent: 'workout', primaryWorkoutFocus: 'back', expectedDurationMinutes: 60, privacyLevel: 'private' });
    expect(getLiveAggregate(checkedIn, 'nyu_palladium').campusFitCheckIns).toBe(before.campusFitCheckIns + 1);
    expect(checkedIn.visits.at(-1)?.privacyLevel).toBe('anonymous_aggregate');
  });

  it('keeps an overdue visit active for a 30-minute reminder grace period', () => {
    const checkedIn = spontaneousCheckIn(createDemoState('nyu'), { facilityId: 'nyu_palladium', intent: 'workout', primaryWorkoutFocus: 'back', expectedDurationMinutes: 60, privacyLevel: 'anonymous_aggregate' });
    const visit = checkedIn.visits.at(-1)!;
    const fiveMinutesLate = addMinutes(visit.expectedEndAt!, 5);
    expect(getActiveVisitTiming(visit, fiveMinutesLate)).toBe('grace_period');
    expect(graceMinutesRemaining(visit, fiveMinutesLate)).toBe(25);
    expect(getActiveVisitTiming(visit, visit.autoCloseAt!)).toBe('auto_close_due');
  });

  it('excludes temporary facility closures from recommendations', () => {
    const state = createDemoState('nyu');
    const closed = { ...state, facilities: state.facilities.map((facility) => facility.id === 'nyu_palladium' ? { ...facility, specialClosure: { startsAt: addMinutes(state.now, -5), endsAt: addMinutes(state.now, 90), reason: 'test' } } : facility) };
    expect(isFacilityOpen(closed.facilities[0]!, state.now)).toBe(false);
    expect(recommendFacilities(closed, state.now, 'back', undefined, 50).find((item) => item.facility.id === 'nyu_palladium')?.eligible).toBe(false);
  });

  it('suppresses rare activity counts at the privacy threshold', () => {
    const state = createDemoState('nyu');
    const aggregate = getLiveAggregate(state, 'nyu_palladium');
    expect(aggregate.activityCounts.filter((item) => item.count !== undefined).every((item) => item.count! >= state.university.privacyCountThreshold)).toBe(true);
    expect(aggregate.sourceExplanation).toContain('not official occupancy');
  });

  it('reduces trust for repeatedly inaccurate expiring reports', () => {
    const at = new Date().toISOString();
    expect(reportTrustWeight([{ accurate: false, expiresAt: addMinutes(at, 10) }, { accurate: false, expiresAt: addMinutes(at, 5) }, { accurate: true, expiresAt: addMinutes(at, 3) }], at)).toBeCloseTo(0.33, 2);
  });

  it('flags one-active-visit abuse', () => {
    const state = createDemoState('nyu');
    const activeUser = state.visits.find((visit) => visit.status === 'checked_in')!.userId;
    expect(assessVisitMutation(state, activeUser, 'check_in').allowed).toBe(false);
  });
});
