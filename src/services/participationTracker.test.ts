import { describe, expect, it } from 'vitest';
import { createDemoState } from '../data/seed';
import { addMinutes } from '../lib/format';
import { forecastDemand } from './forecasting';
import { getLiveAggregate } from './liveAggregation';
import { getFacilityParticipationTracker, mergeFacilityParticipationTrackers } from './participationTracker';
import { checkInPlannedVisit, createPlan, spontaneousCheckIn } from './visitLifecycle';

describe('facility participation tracker', () => {
  it('returns aggregate-only live and planning counts', () => {
    const state = createDemoState('nyu');
    const tracker = getFacilityParticipationTracker(state, 'nyu_palladium');

    expect(tracker.universityId).toBe(state.university.id);
    expect(tracker.campusFitCheckIns).toBe(tracker.plannedCheckIns + tracker.walkInCheckIns);
    expect(tracker.scheduledForWindow).toBe(tracker.scheduledNotCheckedIn);
    expect(tracker.typicalVisitorRange[1]).toBeGreaterThanOrEqual(tracker.typicalVisitorRange[0]);
    expect(tracker.officialOccupancyConnected).toBe(false);
    expect(tracker.sourceExplanation).toContain('No official occupancy feed');
    expect(tracker).not.toHaveProperty('visits');
    expect(tracker).not.toHaveProperty('userIds');
  });

  it('counts only real, unexpired active people in the live total', () => {
    const initial = createDemoState('nyu');
    const checkedIn = spontaneousCheckIn(initial, {
      facilityId: 'nyu_404',
      intent: 'workout',
      primaryWorkoutFocus: 'back',
      expectedDurationMinutes: 60,
      privacyLevel: 'anonymous_aggregate',
    });
    const realVisit = checkedIn.visits.at(-1)!;
    const withStaleVisit = {
      ...checkedIn,
      visits: [
        ...checkedIn.visits,
        {
          ...realVisit,
          id: 'stale_real_visit',
          userId: 'stale_real_user',
          checkedInAt: addMinutes(checkedIn.now, -970),
          expectedEndAt: addMinutes(checkedIn.now, -910),
          autoCloseAt: addMinutes(checkedIn.now, -880),
        },
      ],
    };

    expect(getFacilityParticipationTracker(withStaleVisit, 'nyu_404').campusFitCheckIns).toBe(1);
    expect(getLiveAggregate(withStaleVisit, 'nyu_404').campusFitCheckIns).toBe(1);
    expect(getLiveAggregate(withStaleVisit, 'nyu_palladium').campusFitCheckIns).toBe(0);
  });

  it('updates same-time schedules, arrivals from plans, and walk-ins independently', () => {
    const initial = createDemoState('nyu');
    const arrivalAt = addMinutes(initial.now, 20);
    const before = getFacilityParticipationTracker(initial, 'nyu_palladium', arrivalAt);
    const planned = createPlan(initial, {
      facilityId: 'nyu_palladium',
      plannedArrivalAt: arrivalAt,
      intent: 'workout',
      primaryWorkoutFocus: 'back',
      expectedDurationMinutes: 60,
      privacyLevel: 'anonymous_aggregate'
    });
    const afterPlan = getFacilityParticipationTracker(planned, 'nyu_palladium', arrivalAt);
    expect(afterPlan.scheduledForWindow).toBe(before.scheduledForWindow + 1);

    const planId = planned.visits.at(-1)!.id;
    const checkedInFromPlan = checkInPlannedVisit({ ...planned, now: arrivalAt }, planId);
    const afterArrival = getFacilityParticipationTracker(checkedInFromPlan, 'nyu_palladium', arrivalAt);
    expect(afterArrival.scheduledNotCheckedIn).toBe(afterPlan.scheduledNotCheckedIn - 1);
    expect(afterArrival.plannedCheckIns).toBe(before.plannedCheckIns + 1);

    const walkIn = spontaneousCheckIn({ ...checkedInFromPlan, currentUser: { ...checkedInFromPlan.currentUser, id: 'walk_in_test' } }, {
      facilityId: 'nyu_palladium',
      intent: 'workout',
      primaryWorkoutFocus: 'back',
      expectedDurationMinutes: 45,
      privacyLevel: 'anonymous_aggregate'
    });
    const afterWalkIn = getFacilityParticipationTracker(walkIn, 'nyu_palladium', arrivalAt);
    expect(afterWalkIn.walkInCheckIns).toBe(afterArrival.walkInCheckIns + 1);
  });

  it('uses the backend aggregate without adding another student\'s raw active visit', () => {
    const initial = createDemoState('nyu');
    const intervalEnd = addMinutes(initial.now, 30);
    const sourceExplanation = 'Voluntary CampusFit participation from an aggregate-only backend response. This is not official occupancy.';
    const state = {
      ...initial,
      visits: initial.visits.filter((visit) => visit.userId === initial.currentUser.id),
      participationTrackers: [{
        universityId: initial.university.id,
        facilityId: 'nyu_palladium',
        intervalStart: initial.now,
        intervalEnd,
        campusFitCheckIns: 17,
        plannedCheckIns: 6,
        walkInCheckIns: 11,
        scheduledForWindow: 8,
        scheduledNotCheckedIn: 8,
        typicalVisitorRange: [92, 118] as [number, number],
        confidence: 'medium' as const,
        updatedAt: initial.now,
        sourceExplanation,
        officialOccupancyConnected: false as const,
      }],
      dataSource: 'api' as const,
    };

    const tracker = getFacilityParticipationTracker(state, 'nyu_palladium');
    const live = getLiveAggregate(state, 'nyu_palladium');
    const forecast = forecastDemand(state, 'nyu_palladium');

    expect(tracker.campusFitCheckIns).toBe(17);
    expect(live.campusFitCheckIns).toBe(17);
    expect(live.sourceExplanation).toBe(sourceExplanation);
    expect(forecast.plannedCount).toBe(8);
    expect(forecast.expectedRange[1]).toBeGreaterThan(forecast.expectedRange[0]);
    expect(forecast.confidence).toBe('medium');
    expect(forecast.sourceExplanation).toContain('not official occupancy');
    expect(tracker).not.toHaveProperty('visits');
    expect(tracker).not.toHaveProperty('userIds');
  });

  it('replaces stale aggregate windows without discarding future planning windows', () => {
    const state = createDemoState('nyu');
    const current = getFacilityParticipationTracker(state, 'nyu_palladium');
    const future = getFacilityParticipationTracker(state, 'nyu_palladium', addMinutes(state.now, 90));
    const refreshed = { ...current, campusFitCheckIns: current.campusFitCheckIns + 1, updatedAt: addMinutes(state.now, 1) };

    const merged = mergeFacilityParticipationTrackers([current, future], [refreshed]);

    expect(merged).toHaveLength(2);
    expect(merged).toContainEqual(refreshed);
    expect(merged).toContainEqual(future);
    expect(merged).not.toContainEqual(current);
  });
});
