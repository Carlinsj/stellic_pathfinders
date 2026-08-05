import type { Facility, University } from '../domain/types';

const standardHours = Array.from({ length: 7 }, (_, weekday) => ({
  weekday,
  openingTime: weekday === 0 ? '09:00' : '06:30',
  closingTime: weekday === 5 || weekday === 6 ? '22:00' : '23:30'
}));

const baseline = (peak: number, midday = 0.45): Record<number, number> => ({
  6: 0.28, 7: 0.38, 8: 0.5, 9: 0.38, 10: 0.32, 11: midday, 12: midday + 0.12,
  13: midday, 14: 0.38, 15: 0.5, 16: peak - 0.12, 17: peak - 0.04, 18: peak, 19: peak - 0.05,
  20: 0.58, 21: 0.42, 22: 0.24
});

export const universities: Record<'nyu', University> = {
  nyu: {
    id: 'uni_nyu', slug: 'nyu', name: 'New York University', shortName: 'NYU', mark: 'NYU',
    primaryColor: '#38255c', secondaryColor: '#ede7f6', accentColor: '#f0c06a', timezone: 'America/New_York',
    emailDomain: 'nyu.edu', recreationOfficeName: 'NYU Athletics', privacyCountThreshold: 3, autoCloseGraceMinutes: 25
  }
};

export const facilitiesByTenant: Record<'nyu', Facility[]> = {
  nyu: [
    { id: 'nyu_palladium', universityId: 'uni_nyu', name: 'Palladium Athletic Facility', shortName: 'Palladium', address: '140 E 14th St', description: 'Deep-water pool, multi-use court, climbing wall, cycling room, group fitness, strength, and cardio.', capacity: 620, travelMinutes: 8, activities: ['swimming', 'basketball', 'volleyball', 'climbing', 'cycling', 'group_fitness'], hours: standardHours, baselineByHour: baseline(0.86, 0.48) },
    { id: 'nyu_paulson', universityId: 'uni_nyu', name: 'John A. Paulson Center', shortName: 'Paulson', address: '181 Mercer St', description: 'Six-lane pool, four multi-use courts, squash, jogging track, recreational classes, strength, and cardio.', capacity: 780, travelMinutes: 12, activities: ['swimming', 'basketball', 'volleyball', 'badminton', 'pickleball', 'squash', 'indoor_track', 'group_fitness'], hours: standardHours, baselineByHour: baseline(0.66, 0.4) },
    { id: 'nyu_404', universityId: 'uni_nyu', name: '404 Fitness', shortName: '404 Fitness', address: '404 Lafayette St', description: 'Three floors of strength and cardio with functional turf, fitness studios, cycling, and stretching.', capacity: 260, travelMinutes: 6, activities: ['group_fitness', 'cycling', 'functional_training'], hours: standardHours, baselineByHour: baseline(0.78, 0.52) },
    { id: 'nyu_brooklyn', universityId: 'uni_nyu', name: 'Brooklyn Athletic Facility', shortName: 'Brooklyn', address: '6 MetroTech Center', description: 'Regulation gym, scheduled court sports, group fitness, stretching, strength, and cardio at MetroTech.', capacity: 310, travelMinutes: 24, activities: ['basketball', 'volleyball', 'badminton', 'futsal', 'table_tennis', 'cricket', 'group_fitness'], hours: standardHours, baselineByHour: baseline(0.57, 0.32) }
  ]
};
