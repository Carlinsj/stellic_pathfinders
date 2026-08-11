import { describe, expect, it } from 'vitest';
import { createDemoState } from '../data/seed';
import { addSyntheticVisit, checkOutSyntheticVisit, delayNextPlannedVisit, moveSyntheticVisit } from './demoOperations';

describe('demo operations', () => {
  it('creates tenant-owned synthetic visits', () => {
    const state = createDemoState('nyu');
    const next = addSyntheticVisit(state, 'checked_in', 'general_workout', 'squash');
    expect(next.visits).toHaveLength(state.visits.length + 1);
    expect(next.visits.at(-1)).toMatchObject({ universityId: state.university.id, source: 'demo', activity: 'squash', status: 'checked_in' });
  });

  it('preserves deterministic delay, checkout, and move outcomes', () => {
    const state = createDemoState('nyu');
    const planned = state.visits.find((visit) => visit.status === 'planned' && visit.plannedArrivalAt)!;
    expect(delayNextPlannedVisit(state).visits.find((visit) => visit.id === planned.id)?.status).toBe('delayed');

    const active = state.visits.find((visit) => visit.status === 'checked_in' && visit.userId.startsWith('nyu_synthetic'))!;
    expect(checkOutSyntheticVisit(state, 'nyu').visits.find((visit) => visit.id === active.id)?.status).toBe('completed');
    expect(moveSyntheticVisit(state, 'nyu').visits.find((visit) => visit.id === active.id)?.facilityId).not.toBe(active.facilityId);
  });
});
