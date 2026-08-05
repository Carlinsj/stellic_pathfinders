import { describe, expect, it } from 'vitest';
import {
  getWorkoutFocusEquipmentKeys,
  getWorkoutFocusEquipmentWeight,
  normalizeWorkoutFocuses,
  splitWorkoutFocuses,
  toggleWorkoutFocusSelection
} from './workoutFocus';

describe('multi-focus workout selection', () => {
  it('normalizes a primary focus and multiple secondary muscle groups', () => {
    expect(normalizeWorkoutFocuses('back', ['biceps', 'back', 'invalid'])).toEqual(['back', 'biceps']);
    expect(splitWorkoutFocuses(['chest', 'legs'])).toEqual({
      primaryWorkoutFocus: 'chest',
      secondaryFocuses: ['legs']
    });
  });

  it('allows multiple selections without allowing an empty workout', () => {
    expect(toggleWorkoutFocusSelection(['back'], 'biceps')).toEqual(['back', 'biceps']);
    expect(toggleWorkoutFocusSelection(['back', 'biceps'], 'back')).toEqual(['biceps']);
    expect(toggleWorkoutFocusSelection(['biceps'], 'biceps')).toEqual(['biceps']);
  });

  it('combines equipment needs while counting shared equipment once per visit', () => {
    const equipment = getWorkoutFocusEquipmentKeys(['chest', 'legs']);
    expect(equipment).toEqual(expect.arrayContaining(['bench', 'squat_rack', 'leg_press']));
    expect(getWorkoutFocusEquipmentWeight(['back', 'biceps'], 'cable')).toBe(1);
  });
});
