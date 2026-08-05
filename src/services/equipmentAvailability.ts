import { focusEquipmentWeights, titleCase } from '../data/catalog';
import type { DemoState, EquipmentAvailabilityLevel, WorkoutEquipmentAvailability } from '../domain/types';

const availabilityRank: Record<EquipmentAvailabilityLevel, number> = {
  unavailable: 0,
  limited: 1,
  available: 2
};

export const getWorkoutEquipmentAvailability = (
  state: DemoState,
  facilityId: string,
  focus: string
): WorkoutEquipmentAvailability[] => {
  const facility = state.facilities.find((item) =>
    item.id === facilityId && item.universityId === state.university.id);
  if (!facility) throw new Error('Facility not found in tenant');

  const relevantEquipment = focusEquipmentWeights[focus] ?? {};
  const focusLabel = titleCase(focus);

  return state.facilityEquipment
    .filter((inventory) =>
      inventory.universityId === state.university.id &&
      inventory.facilityId === facility.id &&
      inventory.totalQuantity > 0)
    .flatMap((inventory) => {
      const equipment = state.equipmentTypes.find((item) => item.id === inventory.equipmentTypeId);
      if (!equipment || !(equipment.key in relevantEquipment)) return [];

      const totalQuantity = inventory.totalQuantity;
      const operationalQuantity = Math.min(totalQuantity, Math.max(0, inventory.operationalQuantity));
      const unavailableQuantity = totalQuantity - operationalQuantity;
      const availability: EquipmentAvailabilityLevel = operationalQuantity === 0
        ? 'unavailable'
        : unavailableQuantity > 0
          ? 'limited'
          : 'available';
      const statusText = availability === 'unavailable'
        ? 'All units out of service'
        : availability === 'limited'
          ? `${unavailableQuantity} of ${totalQuantity} out of service`
          : `All ${totalQuantity} operational`;
      const impact = availability === 'unavailable'
        ? `This resource is unavailable for your ${focusLabel} workout. Plan an alternative exercise or compare another NYU facility.`
        : availability === 'limited'
          ? `Fewer units are available for your ${focusLabel} workout, so waits may be longer.`
          : `This resource is ready for your ${focusLabel} workout.`;

      return [{
        equipmentTypeId: equipment.id,
        displayName: equipment.displayName,
        totalQuantity,
        operationalQuantity,
        unavailableQuantity,
        availability,
        relevanceWeight: relevantEquipment[equipment.key] ?? 0,
        statusText,
        impact
      }];
    })
    .sort((left, right) =>
      availabilityRank[left.availability] - availabilityRank[right.availability] ||
      right.relevanceWeight - left.relevanceWeight ||
      left.displayName.localeCompare(right.displayName));
};
