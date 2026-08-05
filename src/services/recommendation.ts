import type { DemoState, FacilityRecommendation } from '../domain/types';
import { activityEquipment } from '../data/catalog';
import { estimateWorkoutDuration } from './durationEstimator';
import { calculateEquipmentDemand } from './equipmentDemand';
import { forecastDemand, isFacilityOpen } from './forecasting';
import { getWorkoutFocusEquipmentKeys, normalizeWorkoutFocuses, type WorkoutFocusInput } from './workoutFocus';

const crowdPenalty = { unknown: 60, low: 0, moderate: 14, busy: 32, very_busy: 55 } as const;
const demandPenalty = { unknown: 20, low: 0, moderate: 6, high: 14, very_high: 25 } as const;

export type RecommendationVerdict = 'strong_fit' | 'best_available' | 'wait_recommended';

export interface RecommendationGuidance {
  verdict: RecommendationVerdict;
  label: string;
  summary: string;
}

export interface BetterRecommendationWindow {
  at: string;
  recommendation: FacilityRecommendation;
  minutesSavedRange: [number, number];
  explanation: string;
}

export interface RecommendationComparison { headline: string; summary: string; factors: string[]; }

export const compareRecommendations = (recommended: FacilityRecommendation, alternative: FacilityRecommendation): RecommendationComparison => {
  const travelDifference = alternative.facility.travelMinutes - recommended.facility.travelMinutes;
  const recommendedWait = recommended.duration.additionalWaitRange;
  const alternativeWait = alternative.duration.additionalWaitRange;
  const alternativeIsCalmer = crowdPenalty[alternative.forecast.crowdLevel] < crowdPenalty[recommended.forecast.crowdLevel];
  return {
    headline: `Why ${recommended.facility.shortName} ranks higher`,
    summary: `${alternativeIsCalmer ? `${alternative.facility.shortName} is less busy overall, but ${recommended.facility.shortName} is expected to be faster for this workout` : `${recommended.facility.shortName} is expected to be the better overall fit for this workout`}${travelDifference > 0 ? ` and is ${travelDifference} minutes closer` : ''}. Equipment waits, travel, overall crowd, and your preferred gym all affect the ranking.`,
    factors: [
      `Overall crowd: ${alternative.facility.shortName} is ${alternative.forecast.crowdLevel.replace('_', ' ')}; ${recommended.facility.shortName} is ${recommended.forecast.crowdLevel.replace('_', ' ')}.`,
      `Workout-specific wait: ${recommended.facility.shortName} ${recommendedWait[0]}–${recommendedWait[1]} min; ${alternative.facility.shortName} ${alternativeWait[0]}–${alternativeWait[1]} min.`,
      `Travel: ${recommended.facility.shortName} ${recommended.facility.travelMinutes} min; ${alternative.facility.shortName} ${alternative.facility.travelMinutes} min.`
    ]
  };
};

export const getRecommendationGuidance = (recommendation: FacilityRecommendation): RecommendationGuidance => {
  const crowd = recommendation.forecast.crowdLevel.replace('_', ' ');
  const strongCrowdLevel = recommendation.forecast.crowdLevel === 'low' || recommendation.forecast.crowdLevel === 'moderate';
  if (recommendation.score >= 70 && strongCrowdLevel) {
    return {
      verdict: 'strong_fit',
      label: 'Your best move right now',
      summary: 'This option clears CampusFit’s threshold for a strong current recommendation.'
    };
  }
  if (recommendation.score >= 60 && recommendation.forecast.crowdLevel !== 'very_busy') {
    return {
      verdict: 'best_available',
      label: 'Best available right now',
      summary: `This is the highest-ranked current option, but overall demand is still ${crowd}.`
    };
  }
  return {
    verdict: 'wait_recommended',
    label: `Best available now — still ${crowd}`,
    summary: 'This is the highest-ranked open option, not a low-crowd recommendation. A later visit may be a better choice.'
  };
};

export const recommendFacilities = (
  state: DemoState,
  at: string,
  focus: WorkoutFocusInput,
  activity: string | undefined,
  normalDuration: number,
  requiredEquipment: string[] = []
): FacilityRecommendation[] => {
  const selectedFocuses = normalizeWorkoutFocuses(focus);
  const focusNeeds = getWorkoutFocusEquipmentKeys(selectedFocuses);
  const essentialActivityEquipment = activity ? activityEquipment[activity] ?? [] : [];
  const essential = new Set([...requiredEquipment, ...essentialActivityEquipment]);
  return state.facilities.map((facility) => {
    const supportsActivity = !activity || facility.activities.includes(activity);
    const inventory = state.facilityEquipment.filter((item) => item.facilityId === facility.id);
    const supportsEquipment = [...essential].every((key) => inventory.some((item) => item.equipmentTypeId === key && item.operationalQuantity > 0));
    const open = isFacilityOpen(facility, at);
    const eligible = supportsActivity && supportsEquipment && open;
    const forecast = forecastDemand(state, facility.id, at);
    const allDemand = calculateEquipmentDemand(state, facility.id, at, selectedFocuses, activity);
    const relevantKeys = new Set([...focusNeeds, ...essential]);
    const equipmentDemand = allDemand.filter((item) => relevantKeys.has(item.equipmentTypeId)).slice(0, 5);
    const duration = estimateWorkoutDuration(normalDuration, equipmentDemand);
    const preferredBonus = state.currentUser.preferredFacilityId === facility.id ? 9 : 0;
    const equipmentCost = equipmentDemand.reduce((sum, item) => sum + demandPenalty[item.demandLevel], 0) / Math.max(equipmentDemand.length, 1);
    const score = eligible ? Math.round(100 - crowdPenalty[forecast.crowdLevel] - equipmentCost - facility.travelMinutes * 0.65 + preferredBonus) : -100;
    const mainIssue = equipmentDemand[0];
    const explanation = !open
      ? 'Closed during the selected time.'
      : !supportsActivity
        ? `Does not support ${activity?.replaceAll('_', ' ')}.`
        : !supportsEquipment
          ? 'Missing required operational equipment.'
          : mainIssue && ['high', 'very_high'].includes(mainIssue.demandLevel)
            ? `${facility.shortName} is available, but ${mainIssue.displayName.toLowerCase()} demand may add ${duration.additionalWaitRange[0]}–${duration.additionalWaitRange[1]} minutes.`
            : `${facility.shortName} is predicted to be ${forecast.crowdLevel.replace('_', ' ')} overall, with ${duration.additionalWaitRange[0]}–${duration.additionalWaitRange[1]} minutes of estimated waiting for ${selectedFocuses.length ? 'workout equipment' : 'activity resources'}.`;
    return { facility, score, forecast, equipmentDemand, duration, eligible, explanation };
  }).sort((a, b) => b.score - a.score);
};

export const findBetterRecommendationWindow = (
  state: DemoState,
  from: string,
  focus: WorkoutFocusInput,
  activity: string | undefined,
  normalDuration: number,
  requiredEquipment: string[],
  currentRecommendation: FacilityRecommendation
): BetterRecommendationWindow | undefined => {
  const offsets = [30, 60, 90, 120, 150, 180];
  const candidates = offsets.flatMap((offset) => {
    const at = new Date(Date.parse(from) + offset * 60_000).toISOString();
    const recommendation = recommendFacilities(state, at, focus, activity, normalDuration, requiredEquipment)
      .find((item) => item.eligible);
    return recommendation ? [{ at, recommendation }] : [];
  });
  const bestLater = candidates.reduce<(typeof candidates)[number] | undefined>((best, candidate) => {
    if (!best || candidate.recommendation.score > best.recommendation.score) return candidate;
    return best;
  }, undefined);
  if (!bestLater || bestLater.recommendation.score < currentRecommendation.score + 8) return undefined;

  const currentDuration = currentRecommendation.duration.durationRange;
  const laterDuration = bestLater.recommendation.duration.durationRange;
  const minutesSavedRange: [number, number] = [
    Math.max(0, currentDuration[0] - laterDuration[1]),
    Math.max(0, currentDuration[1] - laterDuration[0])
  ];
  const facilityChanged = bestLater.recommendation.facility.id !== currentRecommendation.facility.id;
  const explanation = facilityChanged
    ? `${bestLater.recommendation.facility.shortName} ranks meaningfully better at this time with ${bestLater.recommendation.forecast.crowdLevel.replace('_', ' ')} predicted crowding.`
    : `${bestLater.recommendation.facility.shortName} becomes meaningfully better as its predicted demand falls.`;
  return { ...bestLater, minutesSavedRange, explanation };
};
