import type { DemoState, FacilityEquipment, TenantSlug, UserProfile, Visit } from '../domain/types';
import { activities, activityEquipment, equipmentTypes, focusEquipmentWeights } from './catalog';
import { facilitiesByTenant, universities } from './universities';

const isoAt = (dayOffset: number, hour: number, minute = 0): string => {
  const date = new Date();
  date.setSeconds(0, 0);
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
};

const addMinutes = (iso: string, minutes: number): string =>
  new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();

const studentProfiles: Record<TenantSlug, UserProfile[]> = {
  nyu: [
    { id: 'nyu_maya', universityId: 'uni_nyu', fullName: 'Maya Chen', email: 'maya.chen@nyu.edu', role: 'student', preferredFacilityId: 'nyu_palladium', defaultPrivacyLevel: 'anonymous_aggregate' },
    { id: 'nyu_theo', universityId: 'uni_nyu', fullName: 'Theo Rivera', email: 'theo.rivera@nyu.edu', role: 'student', preferredFacilityId: 'nyu_paulson', defaultPrivacyLevel: 'anonymous_aggregate' },
    { id: 'nyu_aisha', universityId: 'uni_nyu', fullName: 'Aisha Brooks', email: 'aisha.brooks@nyu.edu', role: 'student', preferredFacilityId: 'nyu_404', defaultPrivacyLevel: 'private' }
  ]
};

export const demoAccounts = {
  nyu: [
    ...studentProfiles.nyu,
    { id: 'nyu_staff_1', universityId: 'uni_nyu', fullName: 'Sam Ortiz', email: 'sam.ortiz@nyu.edu', role: 'recreation_staff', defaultPrivacyLevel: 'private' },
    { id: 'nyu_staff_2', universityId: 'uni_nyu', fullName: 'Priya Shah', email: 'priya.shah@nyu.edu', role: 'recreation_staff', defaultPrivacyLevel: 'private' },
    { id: 'nyu_admin', universityId: 'uni_nyu', fullName: 'Taylor Morgan', email: 'taylor.morgan@nyu.edu', role: 'university_admin', defaultPrivacyLevel: 'private' }
  ] satisfies UserProfile[]
} satisfies Record<TenantSlug, UserProfile[]>;

const baseEquipmentCounts: Record<string, number> = {
  cable: 8, pull_up: 5, lat_pulldown: 5, row_machine: 4, dumbbells: 16, bench: 9,
  smith: 4, squat_rack: 7, leg_press: 4, leg_curl: 4, treadmill: 22, elliptical: 12,
  bike: 14, stair_climber: 7, badminton_court: 4, squash_court: 3, climbing_wall: 1,
  pool_lane: 6, basketball_court: 2, studio: 3, indoor_track: 1, table_tennis_table: 4,
  functional_turf: 1, functional_rig: 4
};

const verifiedNyuResourceCounts: Record<string, Partial<Record<string, number>>> = {
  nyu_palladium: { pool_lane: 8, basketball_court: 1, climbing_wall: 5 },
  nyu_paulson: { pool_lane: 6, basketball_court: 4, squash_court: 2 },
  nyu_404: { studio: 2, functional_turf: 1 },
  nyu_brooklyn: { basketball_court: 1 }
};

const createEquipmentInventory = (tenant: TenantSlug): FacilityEquipment[] =>
  facilitiesByTenant[tenant].flatMap((facility, facilityIndex) => equipmentTypes.map((equipment) => {
    const supportedActivity = Object.entries(activityEquipment).some(([activity, keys]) =>
      facility.activities.includes(activity) && keys.includes(equipment.key));
    const hasStrengthEquipment = equipment.category !== 'activity';
    const present = hasStrengthEquipment || supportedActivity;
    const verifiedCount = verifiedNyuResourceCounts[facility.id]?.[equipment.key];
    const base = present ? verifiedCount ?? Math.max(1, (baseEquipmentCounts[equipment.key] ?? 2) - facilityIndex * 2) : 0;
    const outage = facility.id === 'nyu_palladium' && equipment.key === 'cable';
    return {
      universityId: facility.universityId,
      facilityId: facility.id,
      equipmentTypeId: equipment.id,
      totalQuantity: base,
      operationalQuantity: outage ? Math.max(0, base - 2) : base,
      outageReason: outage ? 'Temporary maintenance — synthetic demo outage' : undefined
    };
  }));

const focuses = Object.keys(focusEquipmentWeights);

const createHistoricalVisits = (tenant: TenantSlug): Visit[] => {
  const university = universities[tenant];
  const facilities = facilitiesByTenant[tenant];
  const users = studentProfiles[tenant];
  return Array.from({ length: 180 }, (_, index) => {
    const facility = facilities[index % facilities.length]!;
    const user = users[index % users.length]!;
    const focus = focuses[index % focuses.length]!;
    const duration = 42 + (index % 7) * 6;
    const checkedInAt = isoAt(-1 - (index % 35), 7 + (index * 3) % 15, (index * 7) % 60);
    return {
      id: `${tenant}_historical_${index}`,
      universityId: university.id,
      userId: user.id,
      facilityId: facility.id,
      status: index % 19 === 0 ? 'auto_closed' : 'completed',
      source: 'demo',
      intent: 'workout',
      checkedInAt,
      checkedOutAt: addMinutes(checkedInAt, duration),
      expectedDurationMinutes: duration,
      expectedEndAt: addMinutes(checkedInAt, duration),
      autoCloseAt: addMinutes(checkedInAt, duration + university.autoCloseGraceMinutes),
      lastActivityAt: checkedInAt,
      primaryWorkoutFocus: focus,
      secondaryFocuses: [],
      equipmentNeeds: Object.keys(focusEquipmentWeights[focus] ?? {}).slice(0, 2),
      privacyLevel: 'anonymous_aggregate',
      reliabilityWeight: index % 19 === 0 ? 0.35 : 1,
      createdAt: checkedInAt,
      updatedAt: addMinutes(checkedInAt, duration)
    };
  });
};

const createLiveVisits = (tenant: TenantSlug): Visit[] => {
  const university = universities[tenant];
  const facilities = facilitiesByTenant[tenant];
  const count = tenant === 'nyu' ? 42 : 52;
  return Array.from({ length: count }, (_, index) => {
    const facility = facilities[index % facilities.length]!;
    const focus = focuses[(index * 5 + (tenant === 'nyu' ? 0 : 2)) % focuses.length]!;
    const checkedInAt = isoAt(0, 17, index % 50);
    const duration = 55 + (index % 4) * 10;
    const activity = index % 4 === 0 ? facility.activities[index % facility.activities.length] : undefined;
    const intent = activity ? 'activity' as const : 'workout' as const;
    return {
      id: `${tenant}_live_${index}`,
      universityId: university.id,
      userId: `${tenant}_synthetic_user_${index}`,
      facilityId: facility.id,
      status: 'checked_in',
      source: 'demo',
      intent,
      checkedInAt,
      expectedDurationMinutes: duration,
      expectedEndAt: addMinutes(checkedInAt, duration),
      autoCloseAt: addMinutes(checkedInAt, duration + university.autoCloseGraceMinutes),
      lastActivityAt: checkedInAt,
      primaryWorkoutFocus: intent === 'workout' ? focus : undefined,
      secondaryFocuses: [],
      activity,
      equipmentNeeds: intent === 'activity' ? activityEquipment[activity!] ?? [] : Object.keys(focusEquipmentWeights[focus] ?? {}).slice(0, 2),
      privacyLevel: 'anonymous_aggregate',
      reliabilityWeight: 1,
      createdAt: checkedInAt,
      updatedAt: checkedInAt
    };
  });
};

const createPlannedVisits = (tenant: TenantSlug): Visit[] => {
  const university = universities[tenant];
  const facilities = facilitiesByTenant[tenant];
  return Array.from({ length: 28 }, (_, index) => {
    const facility = facilities[(index * 3) % facilities.length]!;
    const focus = focuses[(index + 3) % focuses.length]!;
    const arrival = isoAt(0, 18 + (index % 3), index % 4 * 15);
    const activity = index % 5 === 0 ? facility.activities[index % facility.activities.length] : undefined;
    const intent = activity ? 'activity' as const : 'workout' as const;
    return {
      id: `${tenant}_planned_${index}`,
      universityId: university.id,
      userId: `${tenant}_future_user_${index}`,
      facilityId: facility.id,
      status: 'planned',
      source: 'demo',
      intent,
      plannedArrivalAt: arrival,
      originalPlannedArrivalAt: arrival,
      expectedDurationMinutes: 60,
      primaryWorkoutFocus: intent === 'workout' ? focus : undefined,
      secondaryFocuses: [],
      activity,
      equipmentNeeds: intent === 'activity' ? activityEquipment[activity!] ?? [] : Object.keys(focusEquipmentWeights[focus] ?? {}).slice(0, 3),
      privacyLevel: 'anonymous_aggregate',
      reliabilityWeight: 1,
      createdAt: isoAt(0, 12),
      updatedAt: isoAt(0, 12)
    };
  });
};

export const createDemoState = (tenant: TenantSlug): DemoState => ({
  university: universities[tenant],
  currentUser: studentProfiles[tenant][0]!,
  facilities: facilitiesByTenant[tenant],
  equipmentTypes,
  facilityEquipment: createEquipmentInventory(tenant),
  visits: [...createHistoricalVisits(tenant), ...createLiveVisits(tenant), ...createPlannedVisits(tenant)],
  history: [],
  now: isoAt(0, 17, 45)
});

export const seedSummary = {
  universities: 1,
  facilities: 4,
  equipmentTypes: equipmentTypes.length,
  activities: activities.length,
  workoutFocuses: 12,
  syntheticVisitsPerUniversity: 250
};
