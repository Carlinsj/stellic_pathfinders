import { describe, expect, it } from 'vitest';
import { createDemoState } from '../data/seed';
import { getWorkoutEquipmentAvailability } from './equipmentAvailability';

describe('workout equipment availability', () => {
  it('returns only equipment relevant to the selected workout focus', () => {
    const state = createDemoState('nyu');
    const availability = getWorkoutEquipmentAvailability(state, 'nyu_palladium', 'back');

    expect(availability.map((item) => item.equipmentTypeId)).toEqual(
      expect.arrayContaining(['cable', 'pull_up', 'lat_pulldown', 'row_machine', 'dumbbells'])
    );
    expect(availability.every((item) => state.equipmentTypes
      .find((type) => type.id === item.equipmentTypeId)?.supportedFocuses.includes('back'))).toBe(true);
  });

  it('puts affected equipment first and describes the student impact', () => {
    const state = createDemoState('nyu');
    const availability = getWorkoutEquipmentAvailability(state, 'nyu_palladium', 'back');

    expect(availability[0]).toMatchObject({
      equipmentTypeId: 'cable',
      totalQuantity: 8,
      operationalQuantity: 6,
      unavailableQuantity: 2,
      availability: 'limited',
      statusText: '2 of 8 out of service'
    });
    expect(availability[0]?.impact).toContain('Back workout');
  });

  it('distinguishes a complete outage from reduced supply', () => {
    const state = createDemoState('nyu');
    const outageState = {
      ...state,
      facilityEquipment: state.facilityEquipment.map((item) =>
        item.facilityId === 'nyu_palladium' && item.equipmentTypeId === 'cable'
          ? { ...item, operationalQuantity: 0 }
          : item)
    };

    expect(getWorkoutEquipmentAvailability(outageState, 'nyu_palladium', 'back')[0]).toMatchObject({
      equipmentTypeId: 'cable',
      availability: 'unavailable',
      statusText: 'All units out of service'
    });
  });

  it('rejects facilities outside the active university', () => {
    expect(() => getWorkoutEquipmentAvailability(createDemoState('nyu'), 'foreign_facility', 'back'))
      .toThrow('Facility not found in tenant');
  });
});
