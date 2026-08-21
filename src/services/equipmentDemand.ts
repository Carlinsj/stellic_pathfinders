import type { DemoState, DemandLevel, EquipmentDemand } from '../domain/types';
import { activityEquipment } from '../data/catalog';
import { getVisitWorkoutFocuses, getWorkoutFocusEquipmentKeys, getWorkoutFocusEquipmentWeight, type WorkoutFocusInput } from './workoutFocus';
import { getFacilityParticipationTracker } from './participationTracker';

const demandLevel = (ratio: number): DemandLevel => {
  if (ratio < 0.6) return 'low';
  if (ratio < 0.95) return 'moderate';
  if (ratio < 1.45) return 'high';
  return 'very_high';
};

const activeDuring = (start: string | undefined, duration: number, at: string): boolean => {
  if (!start) return false;
  const time = Date.parse(at);
  return Date.parse(start) <= time + 30 * 60_000 && Date.parse(start) + duration * 60_000 > time;
};

export const calculateEquipmentDemand = (
  state: DemoState,
  facilityId: string,
  at = state.now,
  selectedFocus?: WorkoutFocusInput,
  selectedActivity?: string
): EquipmentDemand[] => {
  const facility = state.facilities.find((item) => item.id === facilityId);
  if (!facility) throw new Error('Facility not found in tenant');
  const visits = state.visits.filter((visit) => {
    if (visit.facilityId !== facilityId) return false;
    if (visit.status === 'checked_in') return activeDuring(visit.checkedInAt, visit.expectedDurationMinutes, at);
    if (visit.status === 'planned' || visit.status === 'delayed') return activeDuring(visit.plannedArrivalAt, visit.expectedDurationMinutes, at);
    return false;
  });
  const selectedKeys = new Set([
    ...getWorkoutFocusEquipmentKeys(selectedFocus),
    ...(selectedActivity ? activityEquipment[selectedActivity] ?? [] : [])
  ]);
  const historicalPressure = facility.baselineByHour[new Date(at).getHours()] ?? 0.35;
  const participation = getFacilityParticipationTracker(state, facilityId, at);
  const hasApiTracker = state.participationTrackers?.includes(participation) ?? false;
  const aggregateParticipation = hasApiTracker ? participation.campusFitCheckIns : 0;
  return state.facilityEquipment
    .filter((item) => item.facilityId === facilityId && item.totalQuantity > 0)
    .map((inventory) => {
      const equipment = state.equipmentTypes.find((item) => item.id === inventory.equipmentTypeId)!;
      const relevantDemand = visits.reduce((sum, visit) => {
        const focusWeight = visit.intent === 'workout'
          ? getWorkoutFocusEquipmentWeight(getVisitWorkoutFocuses(visit), equipment.key)
          : 0;
        const activityWeight = visit.activity && activityEquipment[visit.activity]?.includes(equipment.key) ? 1.25 : 0;
        return sum + Math.max(focusWeight, activityWeight) * (visit.status === 'checked_in' ? 1 : 0.72);
      }, 0);
      const personalDemand = selectedKeys.has(equipment.key) ? 0.8 : 0;
      const operational = inventory.operationalQuantity;
      const aggregatePressure = aggregateParticipation * historicalPressure * 0.08;
      const ratio = operational === 0 ? 3 : (relevantDemand * 0.78 + aggregatePressure + historicalPressure * operational * 0.72 + personalDemand) / operational;
      const level = demandLevel(ratio);
      const baseQueue = level === 'low' ? 1 : level === 'moderate' ? 5 : level === 'high' ? 11 : 18;
      const outagePenalty = Math.max(0, inventory.totalQuantity - operational) * 3;
      const lowQueue = operational === 0 ? 25 : Math.max(0, baseQueue + outagePenalty - 2);
      const highQueue = operational === 0 ? 40 : baseQueue + outagePenalty + (level === 'very_high' ? 12 : 7);
      return {
        equipmentTypeId: equipment.id,
        displayName: equipment.displayName,
        demandLevel: level,
        queueRange: [lowQueue, highQueue] as [number, number],
        confidence: hasApiTracker ? participation.confidence : visits.length >= 8 ? 'medium' as const : 'low' as const,
        explanation: operational === 0
          ? `All ${equipment.displayName.toLowerCase()} are currently marked unavailable.`
          : `Aggregate CampusFit participation and historical resource pressure for ${operational} operational ${operational === 1 ? 'unit' : 'units'}${inventory.outageReason ? '; an outage is reducing supply' : ''}.`,
        operationalQuantity: operational
      };
    })
    .sort((a, b) => {
      const rank: Record<DemandLevel, number> = { unknown: 0, low: 1, moderate: 2, high: 3, very_high: 4 };
      return rank[b.demandLevel] - rank[a.demandLevel] || b.queueRange[1] - a.queueRange[1];
    });
};
