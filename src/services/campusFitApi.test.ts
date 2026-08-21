import { describe, expect, it } from 'vitest';
import { addMinutes } from '../lib/format';
import { createCampusFitApi } from './campusFitApi';
import { createPlan } from './visitLifecycle';

const universityId = '11111111-1111-1111-1111-111111111111';
const userId = '22222222-2222-2222-2222-222222222222';
const facilityId = '33333333-3333-3333-3333-333333333333';
const equipmentId = '44444444-4444-4444-4444-444444444444';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' },
});

const bootstrapPayload = {
  university: {
    id: universityId,
    slug: 'nyu',
    name: 'New York University',
    short_name: 'NYU',
    privacy_count_threshold: 3,
    auto_close_grace_minutes: 30,
  },
  currentUser: {
    id: userId,
    university_id: universityId,
    full_name: 'Maya Chen',
    email: 'maya.chen@nyu.edu',
    role: 'student',
    default_privacy_level: 'anonymous_aggregate',
  },
  facilities: [{
    id: facilityId,
    university_id: universityId,
    name: '404 Fitness',
    short_name: '404',
    capacity: 180,
    facility_equipment: [{
      id: 'inventory-1',
      total_quantity: 12,
      operational_quantity: 12,
      notes: 'CampusFit deterministic seed',
      equipment_types: { id: equipmentId, key: 'cable' },
      equipment_outages: [],
    }],
    facility_activities: [{ availability: 'available', activities: { key: 'group_fitness' } }],
    facility_operating_hours: [],
    facility_closures: [],
  }],
  equipmentTypes: [{ id: equipmentId, key: 'cable', display_name: 'Cable station', category: 'strength' }],
  workoutFocuses: [{ id: 'focus-1', key: 'general_workout' }],
  activities: [],
  ownVisits: [],
  demoStatus: {
    universityId,
    activeCheckIns: 10,
    futurePlans: 4,
    hasPlannedVisit: true,
    hasSyntheticActiveVisit: true,
    updatedAt: '2026-08-20T12:00:00.000Z',
  },
};

type BootstrapPayload = Omit<typeof bootstrapPayload, 'ownVisits'> & { ownVisits: unknown[] };

const createHarness = (payload: BootstrapPayload = bootstrapPayload) => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const storageValues = new Map<string, string>();
  const storage = {
    getItem: (key: string) => storageValues.get(key) ?? null,
    setItem: (key: string, value: string) => { storageValues.set(key, value); },
    removeItem: (key: string) => { storageValues.delete(key); },
  };
  const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    if (url.endsWith('/auth/demo/session')) {
      return json({ accessToken: 'test-token', currentUser: payload.currentUser });
    }
    if (url.endsWith('/tenants/nyu/bootstrap')) return json(payload);
    if (url.includes('/participation')) {
      const at = new URL(url, 'http://localhost').searchParams.get('at') ?? '2026-08-20T12:00:00.000Z';
      return json({
        universityId,
        facilityId,
        intervalStart: at,
        intervalEnd: addMinutes(at, 30),
        campusFitCheckIns: 10,
        plannedCheckIns: 4,
        walkInCheckIns: 6,
        scheduledForWindow: 3,
        scheduledNotCheckedIn: 3,
        typicalVisitorRange: [70, 92],
        confidence: 'medium',
        updatedAt: at,
        sourceExplanation: 'Aggregate CampusFit participation. This is not official occupancy.',
        officialOccupancyConnected: false,
      });
    }
    if (url.endsWith('/tenants/nyu/me/visits') && init?.method === 'POST') {
      return json({ visit: { id: 'remote-visit' } }, 201);
    }
    return json({ error: 'NOT_FOUND' }, 404);
  }) as typeof fetch;
  const api = createCampusFitApi({ baseUrl: 'http://campusfit.test/api/v1', fetcher, storage, mode: 'remote' });
  return { api, calls, storageValues };
};

describe('CampusFit API adapter', () => {
  it('hydrates tenant-scoped domain state from private visits and aggregate participation', async () => {
    const { api, calls, storageValues } = createHarness();
    await api.signInDemo('nyu', userId);
    const state = await api.loadTenantState('nyu');

    expect(state.dataSource).toBe('api');
    expect(state.university.id).toBe(universityId);
    expect(state.currentUser.id).toBe(userId);
    expect(state.facilities[0]?.universityId).toBe(universityId);
    expect(state.facilityEquipment[0]).toMatchObject({
      universityId,
      facilityId,
      equipmentTypeId: 'cable',
      operationalQuantity: 12,
      outageReason: undefined,
    });
    expect(state.equipmentTypes[0]).toMatchObject({
      id: 'cable',
      backendId: equipmentId,
      supportedFocuses: expect.arrayContaining(['back']),
    });
    expect(state.participationTrackers?.[0]).toMatchObject({
      universityId,
      facilityId,
      campusFitCheckIns: 10,
      officialOccupancyConnected: false,
    });
    expect(state.visits).toEqual([]);
    expect(storageValues.has('campusfit.api.session.nyu')).toBe(true);
    const bootstrapCall = calls.find((call) => call.url.endsWith('/tenants/nyu/bootstrap'));
    expect(bootstrapCall?.init?.headers).toMatchObject({ Authorization: 'Bearer test-token' });
  });

  it('persists an optimistic plan through the backend visit endpoint', async () => {
    const { api, calls } = createHarness();
    await api.signInDemo('nyu', userId);
    const before = await api.loadTenantState('nyu');
    const after = createPlan(before, {
      facilityId,
      plannedArrivalAt: addMinutes(before.now, 30),
      intent: 'workout',
      primaryWorkoutFocus: 'general_workout',
      expectedDurationMinutes: 50,
      privacyLevel: 'anonymous_aggregate',
    });

    await expect(api.syncTenantChange('nyu', before, after)).resolves.toBe(true);
    const createCall = calls.find((call) => call.url.endsWith('/tenants/nyu/me/visits') && call.init?.method === 'POST');
    expect(JSON.parse(String(createCall?.init?.body))).toMatchObject({
      mode: 'plan',
      facilityId,
      intent: 'workout',
      workoutFocuses: ['general_workout'],
      expectedDurationMinutes: 50,
      privacyLevel: 'anonymous_aggregate',
    });
    expect(createCall?.init?.headers).toMatchObject({ Authorization: 'Bearer test-token' });
  });

  it('refreshes aggregate windows for future plans without fanning out across visit history', async () => {
    const payload: BootstrapPayload = {
      ...bootstrapPayload,
      ownVisits: [
        {
          id: 'historical-visit', university_id: universityId, user_id: userId, facility_id: facilityId,
          status: 'completed', source: 'planned', intent: 'workout', planned_arrival_at: '2025-01-10T12:00:00.000Z',
          expected_duration_minutes: 60, created_at: '2025-01-01T12:00:00.000Z', updated_at: '2025-01-10T13:00:00.000Z',
        },
        {
          id: 'future-visit', university_id: universityId, user_id: userId, facility_id: facilityId,
          status: 'planned', source: 'planned', intent: 'workout', planned_arrival_at: '2027-01-10T12:00:00.000Z',
          expected_duration_minutes: 60, created_at: '2026-12-01T12:00:00.000Z', updated_at: '2026-12-01T12:00:00.000Z',
        },
      ],
    };
    const { api, calls } = createHarness(payload);
    await api.signInDemo('nyu', userId);
    await api.loadTenantState('nyu');

    const participationCalls = calls.filter((call) => call.url.includes('/participation'));
    expect(participationCalls).toHaveLength(2);
    expect(participationCalls.some((call) => call.url.includes('2027-01-10'))).toBe(true);
    expect(participationCalls.some((call) => call.url.includes('2025-01-10'))).toBe(false);
  });
});
