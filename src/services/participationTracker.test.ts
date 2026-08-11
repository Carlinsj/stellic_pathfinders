import { describe, expect, it } from 'vitest';
import { createDemoState } from '../data/seed';
import { addMinutes } from '../lib/format';
import { getFacilityParticipationTracker } from './participationTracker';
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
});
