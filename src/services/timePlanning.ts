import type { CrowdLevel, DemoState, FacilityRecommendation } from '../domain/types';
import { recommendFacilities } from './recommendation';
import type { WorkoutFocusInput } from './workoutFocus';

export interface TimeSuggestion {
  at: string;
  recommendation: FacilityRecommendation;
}

export interface TimePlanningInsights {
  selected?: FacilityRecommendation;
  suggestions: TimeSuggestion[];
  disruptions: string[];
  sourceExplanation: string;
}

const candidateTimes = (arrivalAt: string): string[] => {
  const day = new Date(arrivalAt);
  return Array.from({ length: 33 }, (_, index) => {
    const candidate = new Date(day);
    const minutes = 6 * 60 + 30 + index * 30;
    candidate.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
    return candidate.toISOString();
  });
};

const crowdRank: Record<CrowdLevel, number> = { low: 0, moderate: 1, busy: 2, very_busy: 3, unknown: 4 };

export const getTimePlanningInsights = (
  state: DemoState,
  arrivalAt: string,
  focus: WorkoutFocusInput,
  activity: string | undefined,
  normalDuration: number,
  requiredEquipment: string[]
): TimePlanningInsights => {
  const recommendationsAt = (at: string) => recommendFacilities(state, at, focus, activity, normalDuration, requiredEquipment);
  const selected = recommendationsAt(arrivalAt).find((item) => item.eligible);
  const today = new Date(arrivalAt).toDateString() === new Date(state.now).toDateString();
  const ranked = candidateTimes(arrivalAt)
    .filter((at) => !today || Date.parse(at) >= Date.parse(state.now))
    .flatMap((at) => {
      const recommendation = recommendationsAt(at).find((item) => item.eligible);
      return recommendation ? [{ at, recommendation }] : [];
    })
    .sort((left, right) =>
      crowdRank[left.recommendation.forecast.crowdLevel] - crowdRank[right.recommendation.forecast.crowdLevel] ||
      left.recommendation.duration.durationRange[1] - right.recommendation.duration.durationRange[1] ||
      right.recommendation.score - left.recommendation.score);
  const suggestions: TimeSuggestion[] = [];
  for (const candidate of ranked) {
    if (suggestions.every((item) => Math.abs(Date.parse(item.at) - Date.parse(candidate.at)) >= 60 * 60_000)) suggestions.push(candidate);
    if (suggestions.length === 3) break;
  }

  const selectedRecommendations = recommendationsAt(arrivalAt);
  const disruptions = selectedRecommendations.flatMap((item) => {
    if (!item.eligible && item.explanation.includes('Closed')) return [`${item.facility.shortName}: closed at this time.`];
    return state.facilityEquipment
      .filter((inventory) => inventory.facilityId === item.facility.id && requiredEquipment.includes(inventory.equipmentTypeId) && inventory.operationalQuantity < inventory.totalQuantity)
      .map((inventory) => {
        const equipment = state.equipmentTypes.find((type) => type.id === inventory.equipmentTypeId);
        const unavailable = inventory.totalQuantity - inventory.operationalQuantity;
        return `${item.facility.shortName}: ${unavailable} of ${inventory.totalQuantity} ${equipment?.displayName.toLowerCase() ?? 'equipment units'} out of service${inventory.outageReason ? ` (${inventory.outageReason})` : ''}.`;
      });
  });

  return {
    selected,
    suggestions,
    disruptions: [...new Set(disruptions)].slice(0, 4),
    sourceExplanation: 'Suggestions combine synthetic prior-day patterns for this weekday and time with declared plans, active CampusFit check-ins, facility hours, and reported equipment outages. They are estimates, not official occupancy.'
  };
};
