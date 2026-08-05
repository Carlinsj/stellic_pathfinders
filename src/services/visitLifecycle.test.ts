import { describe, expect, it } from 'vitest';
import { createDemoState } from '../data/seed';
import { addMinutes } from '../lib/format';
import { getLiveAggregate } from './liveAggregation';
import {
  VisitLifecycleError, autoCloseStaleVisits, cancelVisit, canTransition, changeActivity, changeFacility,
  changeWorkoutFocus, checkInPlannedVisit, checkOutVisit, createPlan, delayVisit, expirePastPlans,
  extendVisit, spontaneousCheckIn
} from './visitLifecycle';

const draft = { facilityId: 'nyu_palladium', intent: 'workout' as const, primaryWorkoutFocus: 'back', secondaryFocuses: ['biceps'], expectedDurationMinutes: 50, privacyLevel: 'anonymous_aggregate' as const };

describe('visit state machine', () => {
  it('allows documented transitions and rejects closed-state reopening', () => {
    expect(canTransition('planned', 'delayed')).toBe(true);
    expect(canTransition('delayed', 'checked_in')).toBe(true);
    expect(canTransition('checked_in', 'completed')).toBe(true);
    expect(canTransition('completed', 'checked_in')).toBe(false);
    expect(canTransition('cancelled', 'completed')).toBe(false);
    expect(canTransition('expired', 'checked_in')).toBe(false);
    expect(canTransition('auto_closed', 'checked_in')).toBe(false);
  });

  it('creates and updates a planned visit', () => {
    const state = createDemoState('nyu');
    const planned = createPlan(state, { ...draft, plannedArrivalAt: addMinutes(state.now, 30) });
    const visit = planned.visits.at(-1)!;
    const delayed = delayVisit(planned, visit.id, 20);
    expect(delayed.visits.at(-1)?.status).toBe('delayed');
    expect(Date.parse(delayed.visits.at(-1)!.plannedArrivalAt!) - Date.parse(visit.plannedArrivalAt!)).toBe(20 * 60_000);
    expect(delayed.history.at(-1)?.newStatus).toBe('delayed');
  });

  it('changes gym only within the current tenant', () => {
    const state = createPlan(createDemoState('nyu'), { ...draft, plannedArrivalAt: addMinutes(createDemoState('nyu').now, 30) });
    const id = state.visits.at(-1)!.id;
    expect(changeFacility(state, id, 'nyu_paulson').visits.at(-1)?.facilityId).toBe('nyu_paulson');
    expect(() => changeFacility(state, id, 'foreign_facility')).toThrow('Cross-tenant');
  });

  it('prevents an activity plan from moving to an unsupported facility', () => {
    const initial = createDemoState('nyu');
    const planned = createPlan(initial, { facilityId: 'nyu_palladium', plannedArrivalAt: addMinutes(initial.now, 30), intent: 'activity', activity: 'swimming', expectedDurationMinutes: 45, privacyLevel: 'anonymous_aggregate' });
    const id = planned.visits.at(-1)!.id;
    expect(changeFacility(planned, id, 'nyu_paulson').visits.at(-1)?.facilityId).toBe('nyu_paulson');
    expect(() => changeFacility(planned, id, 'nyu_404')).toThrow('does not support');
  });

  it('cancels a planned visit', () => {
    const state = createPlan(createDemoState('nyu'), { ...draft, plannedArrivalAt: addMinutes(createDemoState('nyu').now, 30) });
    expect(cancelVisit(state, state.visits.at(-1)!.id).visits.at(-1)?.status).toBe('cancelled');
  });

  it('converts a plan to live participation without double counting', () => {
    const initial = createDemoState('nyu');
    const before = getLiveAggregate(initial, draft.facilityId).campusFitCheckIns;
    const planned = createPlan(initial, { ...draft, plannedArrivalAt: addMinutes(initial.now, 30) });
    expect(getLiveAggregate(planned, draft.facilityId).campusFitCheckIns).toBe(before);
    const checkedIn = checkInPlannedVisit(planned, planned.visits.at(-1)!.id);
    expect(getLiveAggregate(checkedIn, draft.facilityId).campusFitCheckIns).toBe(before + 1);
    expect(checkedIn.visits.at(-1)?.plannedArrivalAt).toBeDefined();
  });

  it('supports spontaneous check-in and one active visit per user', () => {
    const state = spontaneousCheckIn(createDemoState('nyu'), draft);
    expect(state.visits.at(-1)?.source).toBe('spontaneous');
    expect(state.visits.at(-1)?.status).toBe('checked_in');
    expect(() => spontaneousCheckIn(state, draft)).toThrow(VisitLifecycleError);
  });

  it('supports activity-only visits without inventing a workout focus', () => {
    const state = spontaneousCheckIn(createDemoState('nyu'), {
      facilityId: 'nyu_palladium',
      intent: 'activity',
      activity: 'swimming',
      expectedDurationMinutes: 45,
      privacyLevel: 'anonymous_aggregate'
    });
    const visit = state.visits.at(-1)!;
    expect(visit.intent).toBe('activity');
    expect(visit.primaryWorkoutFocus).toBeUndefined();
    expect(visit.secondaryFocuses).toEqual([]);
    expect(visit.equipmentNeeds).toEqual(['pool_lane']);
  });

  it('requires an activity for activity-only visits and a supporting facility', () => {
    const state = createDemoState('nyu');
    const base = { facilityId: 'nyu_palladium', intent: 'activity' as const, expectedDurationMinutes: 45, privacyLevel: 'anonymous_aggregate' as const };
    expect(() => spontaneousCheckIn(state, base)).toThrow('activity is required');
    expect(() => spontaneousCheckIn(state, { ...base, activity: 'badminton' })).toThrow('does not support');
  });

  it('checks out and removes live aggregate participation', () => {
    const checkedIn = spontaneousCheckIn(createDemoState('nyu'), draft);
    const id = checkedIn.visits.at(-1)!.id;
    const before = getLiveAggregate(checkedIn, draft.facilityId).campusFitCheckIns;
    const completed = checkOutVisit(checkedIn, id, 'about_as_expected');
    expect(completed.visits.at(-1)?.status).toBe('completed');
    expect(getLiveAggregate(completed, draft.facilityId).campusFitCheckIns).toBe(before - 1);
  });

  it('extends an active visit and changes workout/activity', () => {
    const checkedIn = spontaneousCheckIn(createDemoState('nyu'), draft);
    const id = checkedIn.visits.at(-1)!.id;
    const oldEnd = checkedIn.visits.at(-1)!.expectedEndAt!;
    const extended = extendVisit(checkedIn, id, 20);
    expect(Date.parse(extended.visits.at(-1)!.expectedEndAt!) - Date.parse(oldEnd)).toBe(20 * 60_000);
    const focusChanged = changeWorkoutFocus(extended, id, 'arms');
    expect(focusChanged.visits.at(-1)?.primaryWorkoutFocus).toBe('arms');
    expect(changeActivity(focusChanged, id, 'climbing').visits.at(-1)?.activity).toBe('climbing');
  });

  it('automatically closes stale visits with reduced historical weight', () => {
    const checkedIn = spontaneousCheckIn(createDemoState('nyu'), draft);
    const visit = checkedIn.visits.at(-1)!;
    const closed = autoCloseStaleVisits(checkedIn, addMinutes(visit.autoCloseAt!, 1));
    expect(closed.visits.at(-1)?.status).toBe('auto_closed');
    expect(closed.visits.at(-1)?.reliabilityWeight).toBe(0.35);
  });

  it('expires abandoned plans', () => {
    const initial = createDemoState('nyu');
    const planned = createPlan(initial, { ...draft, plannedArrivalAt: addMinutes(initial.now, -120) });
    expect(expirePastPlans(planned).visits.at(-1)?.status).toBe('expired');
  });
});
