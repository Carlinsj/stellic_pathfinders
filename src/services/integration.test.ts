import { describe, expect, it } from 'vitest';
import { createDemoState } from '../data/seed';
import { addMinutes } from '../lib/format';
import { calculateEquipmentDemand } from './equipmentDemand';
import { forecastDemand } from './forecasting';
import { createPlan, delayVisit, spontaneousCheckIn } from './visitLifecycle';

describe('application service integration', () => {
  it('recalculates forecasts after plan creation and delay', () => {
    const state = createDemoState('nyu');
    const at = addMinutes(state.now, 30);
    const before = forecastDemand(state, 'nyu_palladium', at).plannedCount;
    const planned = createPlan(state, { facilityId: 'nyu_palladium', plannedArrivalAt: at, intent: 'workout', primaryWorkoutFocus: 'back', expectedDurationMinutes: 50, privacyLevel: 'anonymous_aggregate' });
    expect(forecastDemand(planned, 'nyu_palladium', at).plannedCount).toBe(before + 1);
    const delayed = delayVisit(planned, planned.visits.at(-1)!.id, 120);
    expect(forecastDemand(delayed, 'nyu_palladium', at).plannedCount).toBe(before);
  });

  it('updates equipment demand after a real-time-style check-in', () => {
    const state = createDemoState('nyu');
    const before = calculateEquipmentDemand(state, 'nyu_palladium', state.now, 'back').find((item) => item.equipmentTypeId === 'cable')!;
    const checkedIn = spontaneousCheckIn(state, { facilityId: 'nyu_palladium', intent: 'workout', primaryWorkoutFocus: 'back', expectedDurationMinutes: 60, privacyLevel: 'anonymous_aggregate' });
    const after = calculateEquipmentDemand(checkedIn, 'nyu_palladium', state.now, 'back').find((item) => item.equipmentTypeId === 'cable')!;
    expect(after.queueRange[1]).toBeGreaterThanOrEqual(before.queueRange[1]);
  });

  it('keeps tenant repositories isolated', () => {
    const nyu = createDemoState('nyu');
    expect(nyu.visits.every((visit) => visit.universityId === nyu.university.id)).toBe(true);
    expect(nyu.facilities.every((facility) => facility.universityId === nyu.university.id)).toBe(true);
    expect(nyu.facilityEquipment.every((inventory) => inventory.universityId === nyu.university.id)).toBe(true);
    expect(nyu.currentUser.universityId).toBe(nyu.university.id);
  });
});
