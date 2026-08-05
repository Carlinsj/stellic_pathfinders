import type { EquipmentType } from '../domain/types';

export const workoutFocuses = [
  { key: 'back', label: 'Back' },
  { key: 'chest', label: 'Chest' },
  { key: 'legs', label: 'Legs' },
  { key: 'shoulders', label: 'Shoulders' },
  { key: 'biceps', label: 'Biceps' },
  { key: 'triceps', label: 'Triceps' },
  { key: 'arms', label: 'Arms' },
  { key: 'cardio', label: 'Cardio' },
  { key: 'full_body', label: 'Full body' },
  { key: 'mobility', label: 'Mobility' },
  { key: 'general_strength', label: 'General strength' },
  { key: 'general_workout', label: 'General workout' }
] as const;

export const activities = [
  { key: 'badminton', label: 'Badminton' },
  { key: 'squash', label: 'Squash' },
  { key: 'climbing', label: 'Climbing' },
  { key: 'swimming', label: 'Swimming' },
  { key: 'basketball', label: 'Basketball' },
  { key: 'volleyball', label: 'Volleyball' },
  { key: 'indoor_track', label: 'Indoor track' },
  { key: 'group_fitness', label: 'Group fitness' },
  { key: 'racquetball', label: 'Racquetball' },
  { key: 'cycling', label: 'Cycling' },
  { key: 'pickleball', label: 'Pickleball' },
  { key: 'futsal', label: 'Futsal' },
  { key: 'table_tennis', label: 'Table tennis' },
  { key: 'cricket', label: 'Cricket' },
  { key: 'functional_training', label: 'Functional training' }
] as const;

export const equipmentTypes: EquipmentType[] = [
  ['cable', 'Cable stations', 'strength', ['back', 'chest', 'arms', 'biceps', 'triceps'], 12],
  ['pull_up', 'Pull-up stations', 'strength', ['back', 'biceps'], 8],
  ['lat_pulldown', 'Lat pulldown machines', 'strength', ['back'], 10],
  ['row_machine', 'Row machines', 'strength', ['back'], 12],
  ['dumbbells', 'Dumbbells', 'strength', ['back', 'chest', 'legs', 'shoulders', 'arms', 'full_body'], 14],
  ['bench', 'Bench stations', 'strength', ['chest', 'arms'], 14],
  ['smith', 'Smith machines', 'strength', ['chest', 'legs', 'full_body'], 15],
  ['squat_rack', 'Squat racks', 'strength', ['legs', 'full_body'], 18],
  ['leg_press', 'Leg press machines', 'strength', ['legs'], 12],
  ['leg_curl', 'Leg curl machines', 'strength', ['legs'], 10],
  ['treadmill', 'Treadmills', 'cardio', ['cardio'], 25],
  ['elliptical', 'Ellipticals', 'cardio', ['cardio'], 25],
  ['bike', 'Stationary bikes', 'cardio', ['cardio'], 25],
  ['stair_climber', 'Stair climbers', 'cardio', ['cardio', 'legs'], 20],
  ['badminton_court', 'Badminton courts', 'activity', [], 45],
  ['squash_court', 'Squash courts', 'activity', [], 45],
  ['climbing_wall', 'Climbing wall', 'activity', [], 60],
  ['pool_lane', 'Pool lanes', 'activity', [], 40],
  ['basketball_court', 'Basketball / multi-use courts', 'activity', [], 50],
  ['studio', 'Fitness studios', 'activity', ['mobility'], 45],
  ['indoor_track', 'Indoor track', 'activity', ['cardio'], 30],
  ['table_tennis_table', 'Table tennis tables', 'activity', [], 30],
  ['functional_turf', 'Functional training turf', 'activity', [], 30],
  ['functional_rig', 'Functional training rigs', 'strength', ['full_body', 'general_strength'], 15]
].map(([key, displayName, category, supportedFocuses, defaultUsageMinutes]) => ({
  id: String(key),
  key: String(key),
  displayName: String(displayName),
  category: String(category),
  supportedFocuses: supportedFocuses as string[],
  defaultUsageMinutes: Number(defaultUsageMinutes)
}));

export const activityEquipment: Record<string, string[]> = {
  badminton: ['badminton_court'],
  squash: ['squash_court'],
  climbing: ['climbing_wall'],
  swimming: ['pool_lane'],
  basketball: ['basketball_court'],
  volleyball: ['basketball_court'],
  indoor_track: ['indoor_track'],
  group_fitness: ['studio'],
  racquetball: ['squash_court'],
  cycling: ['bike'],
  pickleball: ['basketball_court'],
  futsal: ['basketball_court'],
  table_tennis: ['table_tennis_table'],
  cricket: ['basketball_court'],
  functional_training: ['functional_turf']
};

export const focusEquipmentWeights: Record<string, Record<string, number>> = {
  back: { cable: 1, pull_up: 0.85, lat_pulldown: 0.95, row_machine: 0.9, dumbbells: 0.45 },
  chest: { bench: 1, dumbbells: 0.8, cable: 0.65, smith: 0.55 },
  legs: { squat_rack: 1, leg_press: 0.9, smith: 0.6, leg_curl: 0.75, dumbbells: 0.35 },
  shoulders: { dumbbells: 1, cable: 0.65, smith: 0.35 },
  biceps: { dumbbells: 0.8, cable: 0.65, pull_up: 0.35 },
  triceps: { cable: 0.9, dumbbells: 0.5, bench: 0.35 },
  arms: { cable: 1, dumbbells: 0.9, bench: 0.45 },
  cardio: { treadmill: 0.8, elliptical: 0.5, bike: 0.55, stair_climber: 0.45, indoor_track: 0.3 },
  full_body: { functional_rig: 0.8, dumbbells: 0.8, squat_rack: 0.55, cable: 0.5 },
  mobility: { studio: 0.75 },
  general_strength: { functional_rig: 0.8, dumbbells: 0.65, cable: 0.55 },
  general_workout: { treadmill: 0.4, dumbbells: 0.4, cable: 0.35 }
};

export const titleCase = (value: string): string =>
  value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());
