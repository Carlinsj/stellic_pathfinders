import { focusEquipmentWeights, workoutFocuses } from '../data/catalog';
import type { Visit } from '../domain/types';

export type WorkoutFocusInput = string | readonly string[] | undefined;

const validFocuses = new Set<string>(workoutFocuses.map((focus) => focus.key));

export const normalizeWorkoutFocuses = (
  focuses: WorkoutFocusInput,
  secondaryFocuses: readonly string[] = []
): string[] => {
  const values = typeof focuses === 'string' ? [focuses] : focuses ?? [];
  return [...new Set([...values, ...secondaryFocuses].filter((focus) => validFocuses.has(focus)))];
};

export const getVisitWorkoutFocuses = (
  visit: Pick<Visit, 'primaryWorkoutFocus' | 'secondaryFocuses'>
): string[] => normalizeWorkoutFocuses(visit.primaryWorkoutFocus, visit.secondaryFocuses);

export const splitWorkoutFocuses = (focuses: WorkoutFocusInput): {
  primaryWorkoutFocus?: string;
  secondaryFocuses: string[];
} => {
  const normalized = normalizeWorkoutFocuses(focuses);
  return {
    primaryWorkoutFocus: normalized[0],
    secondaryFocuses: normalized.slice(1)
  };
};

export const toggleWorkoutFocusSelection = (current: readonly string[], focus: string): string[] => {
  const normalized = normalizeWorkoutFocuses(current);
  if (!validFocuses.has(focus)) return normalized;
  if (normalized.includes(focus)) {
    return normalized.length === 1 ? normalized : normalized.filter((item) => item !== focus);
  }
  return [...normalized, focus];
};

export const getWorkoutFocusEquipmentKeys = (focuses: WorkoutFocusInput): string[] =>
  [...new Set(normalizeWorkoutFocuses(focuses).flatMap((focus) => Object.keys(focusEquipmentWeights[focus] ?? {})))];

export const getWorkoutFocusEquipmentWeight = (focuses: WorkoutFocusInput, equipmentKey: string): number =>
  normalizeWorkoutFocuses(focuses).reduce(
    (highestWeight, focus) => Math.max(highestWeight, focusEquipmentWeights[focus]?.[equipmentKey] ?? 0),
    0
  );
