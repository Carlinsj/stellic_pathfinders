import type { DurationEstimate, EquipmentDemand } from '../domain/types';

export const estimateWorkoutDuration = (normalMinutes: number, demand: EquipmentDemand[]): DurationEstimate => {
  const relevant = demand.filter((item) => item.demandLevel === 'high' || item.demandLevel === 'very_high').slice(0, 3);
  if (relevant.length === 0) {
    return { durationRange: [normalMinutes, normalMinutes + 6], additionalWaitRange: [0, 6], delayCauses: [], confidence: 'medium' };
  }
  const waitLow = Math.round(relevant.reduce((sum, item) => sum + item.queueRange[0], 0) * 0.48);
  const waitHigh = Math.round(relevant.reduce((sum, item) => sum + item.queueRange[1], 0) * 0.52);
  return {
    durationRange: [normalMinutes + waitLow, normalMinutes + waitHigh],
    additionalWaitRange: [waitLow, waitHigh],
    delayCauses: relevant.map((item) => item.displayName),
    confidence: relevant.every((item) => item.confidence === 'medium') ? 'medium' : 'low'
  };
};
