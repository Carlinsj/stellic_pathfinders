import { activities as localActivities, equipmentTypes as localEquipmentTypes, workoutFocuses as localWorkoutFocuses } from '../data/catalog';
import { demoAccounts, createDemoState } from '../data/seed';
import { facilitiesByTenant, universities } from '../data/universities';
import type {
  DemoState,
  DemoStatus,
  EquipmentType,
  Facility,
  FacilityEquipment,
  FacilityParticipationTracker,
  TenantSlug,
  University,
  UserProfile,
  Visit,
} from '../domain/types';
import { getVisitWorkoutFocuses } from './workoutFocus';

type JsonObject = Record<string, unknown>;
type Fetcher = typeof fetch;
type ApiMode = 'auto' | 'local' | 'remote';

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface CampusFitApiOptions {
  baseUrl?: string;
  fetcher?: Fetcher;
  storage?: StorageLike;
  mode?: ApiMode;
}

const object = (value: unknown): JsonObject => value && typeof value === 'object' ? value as JsonObject : {};
const array = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
const relation = (value: unknown): JsonObject => object(Array.isArray(value) ? value[0] : value);
const string = (value: unknown, fallback = ''): string => typeof value === 'string' ? value : fallback;
const number = (value: unknown, fallback = 0): number => typeof value === 'number' ? value : Number(value ?? fallback);
const optionalString = (value: unknown): string | undefined => typeof value === 'string' && value.length > 0 ? value : undefined;

const sessionKey = (tenant: TenantSlug): string => `campusfit.api.session.${tenant}`;

export class CampusFitApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
  }
}

const readMode = (): ApiMode => {
  const configured = import.meta.env.VITE_API_MODE;
  return configured === 'local' || configured === 'remote' ? configured : 'auto';
};

const browserStorage = (): StorageLike | undefined => {
  if (typeof window === 'undefined') return undefined;
  return window.sessionStorage;
};

const mapProfile = (value: unknown): UserProfile => {
  const raw = object(value);
  return {
    id: string(raw.id),
    universityId: string(raw.universityId ?? raw.university_id),
    fullName: string(raw.fullName ?? raw.full_name),
    email: string(raw.email),
    role: string(raw.role) as UserProfile['role'],
    preferredFacilityId: optionalString(raw.preferredFacilityId ?? raw.preferred_facility_id),
    defaultPrivacyLevel: string(raw.defaultPrivacyLevel ?? raw.default_privacy_level, 'anonymous_aggregate') as UserProfile['defaultPrivacyLevel'],
  };
};

const mapUniversity = (tenant: TenantSlug, value: unknown): University => {
  const raw = object(value);
  const fallback = universities[tenant];
  return {
    id: string(raw.id, fallback.id),
    slug: string(raw.slug, tenant) as TenantSlug,
    name: string(raw.name, fallback.name),
    shortName: string(raw.shortName ?? raw.short_name, fallback.shortName),
    mark: string(raw.mark ?? raw.short_name, fallback.mark),
    primaryColor: string(raw.primaryColor ?? raw.primary_colour, fallback.primaryColor),
    secondaryColor: string(raw.secondaryColor ?? raw.secondary_colour, fallback.secondaryColor),
    accentColor: string(raw.accentColor ?? raw.accent_colour, fallback.accentColor),
    timezone: string(raw.timezone, fallback.timezone),
    emailDomain: string(raw.emailDomain ?? raw.email_domain, fallback.emailDomain),
    recreationOfficeName: string(raw.recreationOfficeName ?? raw.recreation_office_name, fallback.recreationOfficeName),
    privacyCountThreshold: number(raw.privacyCountThreshold ?? raw.privacy_count_threshold, fallback.privacyCountThreshold),
    autoCloseGraceMinutes: number(raw.autoCloseGraceMinutes ?? raw.auto_close_grace_minutes, fallback.autoCloseGraceMinutes),
  };
};

const mapEquipmentTypes = (values: unknown): EquipmentType[] => array(values).map((value) => {
  const raw = object(value);
  const key = string(raw.key);
  const fallback = localEquipmentTypes.find((item) => item.key === key);
  const supportedFocuses = array(raw.supported_workout_focuses ?? raw.supportedFocuses).map(String);
  return {
    id: key,
    backendId: string(raw.id),
    key,
    displayName: string(raw.display_name ?? raw.displayName, fallback?.displayName ?? key),
    category: string(raw.category, fallback?.category),
    supportedFocuses: supportedFocuses.length > 0 ? supportedFocuses : fallback?.supportedFocuses ?? [],
    defaultUsageMinutes: number(raw.default_usage_minutes ?? raw.defaultUsageMinutes, fallback?.defaultUsageMinutes ?? 10),
  };
});

const mapFacilities = (tenant: TenantSlug, universityId: string, values: unknown): { facilities: Facility[]; facilityEquipment: FacilityEquipment[] } => {
  const facilityEquipment: FacilityEquipment[] = [];
  const now = Date.now();
  const facilities = array(values).map((value) => {
    const raw = object(value);
    const fallback = facilitiesByTenant[tenant].find((item) =>
      item.name === raw.name || item.shortName === raw.short_name) ?? facilitiesByTenant[tenant][0]!;
    const facilityId = string(raw.id, fallback.id);
    const hours = array(raw.facility_operating_hours).map((entry) => {
      const item = object(entry);
      return {
        weekday: number(item.weekday),
        openingTime: string(item.opening_time, '06:30').slice(0, 5),
        closingTime: string(item.closing_time, '23:30').slice(0, 5),
        closureReason: optionalString(item.closure_reason),
      };
    });
    const facilityActivities = array(raw.facility_activities)
      .filter((entry) => string(object(entry).availability) !== 'unavailable')
      .map((entry) => string(relation(object(entry).activities).key))
      .filter(Boolean);

    for (const entry of array(raw.facility_equipment)) {
      const inventory = object(entry);
      const equipment = relation(inventory.equipment_types);
      const equipmentKey = string(equipment.key);
      if (!equipmentKey) continue;
      const outage = array(inventory.equipment_outages)
        .map(object)
        .find((item) => !item.resolved_at && (!item.expected_resolved_at || Date.parse(string(item.expected_resolved_at)) > now));
      facilityEquipment.push({
        universityId,
        facilityId,
        equipmentTypeId: equipmentKey,
        totalQuantity: number(inventory.total_quantity),
        operationalQuantity: number(inventory.operational_quantity),
        outageReason: optionalString(
          outage?.reason ?? (
            number(inventory.operational_quantity) < number(inventory.total_quantity)
              ? inventory.notes
              : undefined
          ),
        ),
      });
    }

    const activeClosure = array(raw.facility_closures)
      .map(object)
      .find((item) => Date.parse(string(item.starts_at)) <= now && Date.parse(string(item.ends_at)) > now);

    return {
      id: facilityId,
      universityId,
      name: string(raw.name, fallback.name),
      shortName: string(raw.short_name, fallback.shortName),
      address: string(raw.address, fallback.address),
      description: string(raw.description, fallback.description),
      capacity: number(raw.capacity, fallback.capacity),
      travelMinutes: fallback.travelMinutes,
      activities: facilityActivities.length > 0 ? facilityActivities : fallback.activities,
      hours: hours.length > 0 ? hours : fallback.hours,
      baselineByHour: fallback.baselineByHour,
      specialClosure: activeClosure ? {
        startsAt: string(activeClosure.starts_at),
        endsAt: string(activeClosure.ends_at),
        reason: string(activeClosure.reason, 'Temporary facility closure'),
      } : undefined,
    } satisfies Facility;
  });
  return { facilities, facilityEquipment };
};

const mapVisit = (
  value: unknown,
  focusKeysById: Map<string, string>,
  activityKeysById: Map<string, string>,
  equipmentKeysById: Map<string, string>,
): Visit => {
  const raw = object(value);
  const primaryRelation = relation(raw.primary_workout_focus ?? raw.workout_focuses);
  const activityRelation = relation(raw.activities);
  const primaryWorkoutFocus = optionalString(primaryRelation.key)
    ?? focusKeysById.get(string(raw.primary_workout_focus_id));
  const activity = optionalString(activityRelation.key)
    ?? activityKeysById.get(string(raw.activity_id));
  const secondaryFocuses = array(raw.visit_secondary_focuses).flatMap((entry) => {
    const item = object(entry);
    const focus = relation(item.workout_focuses);
    const key = optionalString(focus.key) ?? focusKeysById.get(string(item.workout_focus_id));
    return key ? [key] : [];
  });
  const equipmentNeeds = array(raw.visit_equipment_needs).flatMap((entry) => {
    const item = object(entry);
    const equipment = relation(item.equipment_types);
    const key = optionalString(equipment.key) ?? equipmentKeysById.get(string(item.equipment_type_id));
    return key ? [key] : [];
  });
  const feedback = string(raw.crowd_feedback);
  const mappedFeedback = feedback === 'less_busy' ? 'less_crowded_than_expected'
    : feedback === 'more_busy' ? 'more_crowded_than_expected'
      : feedback === 'about_as_expected' ? 'about_as_expected' : undefined;

  return {
    id: string(raw.id),
    universityId: string(raw.university_id ?? raw.universityId),
    userId: string(raw.user_id ?? raw.userId),
    facilityId: string(raw.facility_id ?? raw.facilityId),
    status: string(raw.status) as Visit['status'],
    source: string(raw.source) as Visit['source'],
    intent: string(raw.intent) as Visit['intent'],
    plannedArrivalAt: optionalString(raw.planned_arrival_at ?? raw.plannedArrivalAt),
    originalPlannedArrivalAt: optionalString(raw.original_planned_arrival_at ?? raw.originalPlannedArrivalAt),
    checkedInAt: optionalString(raw.checked_in_at ?? raw.checkedInAt),
    checkedOutAt: optionalString(raw.checked_out_at ?? raw.checkedOutAt),
    expectedDurationMinutes: number(raw.expected_duration_minutes ?? raw.expectedDurationMinutes, 60),
    expectedEndAt: optionalString(raw.expected_end_at ?? raw.expectedEndAt),
    autoCloseAt: optionalString(raw.auto_close_at ?? raw.autoCloseAt),
    lastActivityAt: optionalString(raw.last_activity_at ?? raw.lastActivityAt),
    primaryWorkoutFocus,
    secondaryFocuses,
    activity,
    equipmentNeeds,
    privacyLevel: string(raw.privacy_level ?? raw.privacyLevel, 'anonymous_aggregate') as Visit['privacyLevel'],
    crowdFeedback: mappedFeedback,
    reliabilityWeight: number(raw.reliability_weight ?? raw.reliabilityWeight, 1),
    createdAt: string(raw.created_at ?? raw.createdAt, new Date().toISOString()),
    updatedAt: string(raw.updated_at ?? raw.updatedAt, new Date().toISOString()),
  };
};

const mapParticipation = (value: unknown): FacilityParticipationTracker => {
  const raw = object(value);
  const range = array(raw.typicalVisitorRange ?? raw.typical_visitor_range).map(Number);
  return {
    universityId: string(raw.universityId ?? raw.university_id),
    facilityId: string(raw.facilityId ?? raw.facility_id),
    intervalStart: string(raw.intervalStart ?? raw.interval_start),
    intervalEnd: string(raw.intervalEnd ?? raw.interval_end),
    campusFitCheckIns: number(raw.campusFitCheckIns ?? raw.campusfit_check_ins),
    plannedCheckIns: number(raw.plannedCheckIns ?? raw.planned_check_ins),
    walkInCheckIns: number(raw.walkInCheckIns ?? raw.walk_in_check_ins),
    scheduledForWindow: number(raw.scheduledForWindow ?? raw.scheduled_for_window),
    scheduledNotCheckedIn: number(raw.scheduledNotCheckedIn ?? raw.scheduled_not_checked_in),
    typicalVisitorRange: [range[0] ?? 0, range[1] ?? 0],
    confidence: string(raw.confidence, 'low') as FacilityParticipationTracker['confidence'],
    updatedAt: string(raw.updatedAt ?? raw.updated_at),
    sourceExplanation: string(raw.sourceExplanation ?? raw.source_explanation),
    officialOccupancyConnected: false,
  };
};

const mapDemoStatus = (value: unknown, universityId: string): DemoStatus | undefined => {
  if (!value) return undefined;
  const raw = object(value);
  return {
    universityId: string(raw.universityId ?? raw.university_id, universityId),
    activeCheckIns: number(raw.activeCheckIns ?? raw.active_check_ins),
    futurePlans: number(raw.futurePlans ?? raw.future_plans),
    hasPlannedVisit: Boolean(raw.hasPlannedVisit ?? raw.has_planned_visit),
    hasSyntheticActiveVisit: Boolean(raw.hasSyntheticActiveVisit ?? raw.has_synthetic_active_visit),
    updatedAt: string(raw.updatedAt ?? raw.updated_at, new Date().toISOString()),
  };
};

const serializeFocuses = (visit: Visit): string[] => getVisitWorkoutFocuses(visit);

export const createCampusFitApi = (options: CampusFitApiOptions = {}) => {
  const baseUrl = (options.baseUrl ?? import.meta.env.VITE_API_BASE_URL ?? '/api/v1').replace(/\/$/, '');
  const fetcher = options.fetcher ?? fetch;
  const storage = options.storage ?? browserStorage();
  const mode = options.mode ?? readMode();
  const sessions = new Map<TenantSlug, { accessToken: string; currentUser: UserProfile }>();

  const readSession = (tenant: TenantSlug) => {
    const inMemory = sessions.get(tenant);
    if (inMemory) return inMemory;
    try {
      const stored = storage?.getItem(sessionKey(tenant));
      if (!stored) return undefined;
      const parsed = JSON.parse(stored) as { accessToken?: string; currentUser?: unknown };
      if (!parsed.accessToken || !parsed.currentUser) return undefined;
      const session = { accessToken: parsed.accessToken, currentUser: mapProfile(parsed.currentUser) };
      sessions.set(tenant, session);
      return session;
    } catch {
      return undefined;
    }
  };

  const writeSession = (tenant: TenantSlug, accessToken: string, currentUser: UserProfile) => {
    const session = { accessToken, currentUser };
    sessions.set(tenant, session);
    try { storage?.setItem(sessionKey(tenant), JSON.stringify(session)); } catch { /* Memory session remains available. */ }
  };

  const request = async <T>(path: string, init: RequestInit = {}, tenant?: TenantSlug): Promise<T> => {
    const session = tenant ? readSession(tenant) : undefined;
    const response = await fetcher(`${baseUrl}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(session ? { Authorization: `Bearer ${session.accessToken}` } : {}),
        ...init.headers,
      },
    });
    if (!response.ok) {
      const body = object(await response.json().catch(() => ({})));
      throw new CampusFitApiError(string(body.message, `CampusFit API request failed (${response.status})`), response.status, optionalString(body.error));
    }
    if (response.status === 204) return undefined as T;
    return await response.json() as T;
  };

  const getParticipation = async (tenant: TenantSlug, facilityId: string, at?: string) => {
    const query = at ? `?at=${encodeURIComponent(at)}` : '';
    return mapParticipation(await request(`/tenants/${tenant}/facilities/${facilityId}/participation${query}`, {}, tenant));
  };

  const loadTenantState = async (tenant: TenantSlug): Promise<DemoState> => {
    const payload = object(await request(`/tenants/${tenant}/bootstrap`, {}, tenant));
    const university = mapUniversity(tenant, payload.university);
    const currentUser = mapProfile(payload.currentUser);
    const equipmentTypes = mapEquipmentTypes(payload.equipmentTypes);
    const { facilities, facilityEquipment } = mapFacilities(tenant, university.id, payload.facilities);
    const focusKeysById = new Map(array(payload.workoutFocuses).map((value) => {
      const raw = object(value);
      return [string(raw.id), string(raw.key)] as const;
    }));
    const activityKeysById = new Map(array(payload.activities).map((value) => {
      const raw = object(value);
      return [string(raw.id), string(raw.key)] as const;
    }));
    const equipmentKeysById = new Map(array(payload.equipmentTypes).map((value) => {
      const raw = object(value);
      return [string(raw.id), string(raw.key)] as const;
    }));
    const visits = array(payload.ownVisits).map((value) => mapVisit(value, focusKeysById, activityKeysById, equipmentKeysById));
    const now = new Date().toISOString();
    const participationRequests = [
      ...facilities.map((facility) => ({ facilityId: facility.id, at: now })),
      ...visits.flatMap((visit) =>
        (visit.status === 'planned' || visit.status === 'delayed') && visit.plannedArrivalAt
          ? [{ facilityId: visit.facilityId, at: visit.plannedArrivalAt }]
          : []),
    ];
    const uniqueRequests = [...new Map(participationRequests.map((item) => [`${item.facilityId}:${item.at.slice(0, 16)}`, item])).values()];
    const participationTrackers = await Promise.all(uniqueRequests.map((item) =>
      getParticipation(tenant, item.facilityId, item.at).catch(() => undefined)));

    return {
      university,
      currentUser,
      facilities,
      equipmentTypes: equipmentTypes.length > 0 ? equipmentTypes : localEquipmentTypes,
      facilityEquipment,
      visits,
      history: [],
      participationTrackers: participationTrackers.filter((item): item is FacilityParticipationTracker => Boolean(item)),
      demoStatus: mapDemoStatus(payload.demoStatus, university.id),
      dataSource: 'api',
      now,
    };
  };

  const patchVisit = (tenant: TenantSlug, visitId: string, body: JsonObject) =>
    request(`/tenants/${tenant}/me/visits/${visitId}`, { method: 'PATCH', body: JSON.stringify(body) }, tenant);

  const syncTenantChange = async (tenant: TenantSlug, before: DemoState, after: DemoState): Promise<boolean> => {
    if (!readSession(tenant) || before.dataSource !== 'api') return false;

    const addedVisit = after.visits.find((visit) => !before.visits.some((item) => item.id === visit.id));
    if (addedVisit) {
      await request(`/tenants/${tenant}/me/visits`, {
        method: 'POST',
        body: JSON.stringify({
          mode: addedVisit.status === 'checked_in' ? 'check_in' : 'plan',
          facilityId: addedVisit.facilityId,
          plannedArrivalAt: addedVisit.plannedArrivalAt,
          intent: addedVisit.intent,
          workoutFocuses: serializeFocuses(addedVisit),
          activity: addedVisit.activity,
          equipmentNeeds: addedVisit.equipmentNeeds,
          expectedDurationMinutes: addedVisit.expectedDurationMinutes,
          privacyLevel: 'anonymous_aggregate',
        }),
      }, tenant);
      return true;
    }

    const removedVisit = before.visits.find((visit) => !after.visits.some((item) => item.id === visit.id));
    if (removedVisit) {
      await request(`/tenants/${tenant}/me/visits/${removedVisit.id}`, { method: 'DELETE' }, tenant);
      return true;
    }

    const visitBefore = before.visits.find((visit) => {
      const next = after.visits.find((item) => item.id === visit.id);
      return next && JSON.stringify(next) !== JSON.stringify(visit);
    });
    const visitAfter = visitBefore ? after.visits.find((visit) => visit.id === visitBefore.id)! : undefined;
    if (visitBefore && visitAfter) {
      if (visitBefore.status !== visitAfter.status) {
        if (visitAfter.status === 'checked_in') await patchVisit(tenant, visitAfter.id, { action: 'check_in' });
        else if (visitAfter.status === 'completed') await patchVisit(tenant, visitAfter.id, {
          action: 'complete',
          crowdFeedback: visitAfter.crowdFeedback === 'less_crowded_than_expected' ? 'less_busy'
            : visitAfter.crowdFeedback === 'more_crowded_than_expected' ? 'more_busy' : 'about_as_expected',
        });
        else if (visitAfter.status === 'cancelled') await patchVisit(tenant, visitAfter.id, { action: 'cancel' });
        else if (visitAfter.status === 'delayed') await patchVisit(tenant, visitAfter.id, { action: 'reschedule', plannedArrivalAt: visitAfter.plannedArrivalAt });
        else throw new Error(`Unsupported remote visit transition to ${visitAfter.status}`);
      } else if (visitBefore.plannedArrivalAt !== visitAfter.plannedArrivalAt) {
        await patchVisit(tenant, visitAfter.id, { action: 'reschedule', plannedArrivalAt: visitAfter.plannedArrivalAt });
      } else if (visitBefore.expectedEndAt !== visitAfter.expectedEndAt) {
        await patchVisit(tenant, visitAfter.id, { action: 'extend', expectedEndAt: visitAfter.expectedEndAt });
      } else if (visitBefore.facilityId !== visitAfter.facilityId) {
        await patchVisit(tenant, visitAfter.id, { action: 'change_facility', facilityId: visitAfter.facilityId });
      } else if (JSON.stringify(serializeFocuses(visitBefore)) !== JSON.stringify(serializeFocuses(visitAfter))) {
        await patchVisit(tenant, visitAfter.id, { action: 'change_workout_focuses', workoutFocuses: serializeFocuses(visitAfter) });
      } else if (visitBefore.activity !== visitAfter.activity) {
        await patchVisit(tenant, visitAfter.id, { action: 'change_activity', activity: visitAfter.activity ?? null });
      }
      return true;
    }

    const equipmentBefore = before.facilityEquipment.find((item) => {
      const next = after.facilityEquipment.find((candidate) =>
        candidate.facilityId === item.facilityId && candidate.equipmentTypeId === item.equipmentTypeId);
      return next && next.operationalQuantity !== item.operationalQuantity;
    });
    if (equipmentBefore) {
      const equipmentAfter = after.facilityEquipment.find((item) =>
        item.facilityId === equipmentBefore.facilityId && item.equipmentTypeId === equipmentBefore.equipmentTypeId)!;
      const equipmentType = before.equipmentTypes.find((item) => item.id === equipmentBefore.equipmentTypeId);
      const change = equipmentAfter.operationalQuantity - equipmentBefore.operationalQuantity;
      await request(`/tenants/${tenant}/staff/facilities/${equipmentBefore.facilityId}/equipment/${equipmentType?.backendId ?? equipmentType?.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          action: change < 0 ? 'mark_unavailable' : 'restore',
          units: Math.abs(change),
          ...(change < 0 ? { reason: equipmentAfter.outageReason ?? 'Staff-reported maintenance' } : {}),
        }),
      }, tenant);
      return true;
    }

    const facilityBefore = before.facilities.find((facility) => {
      const next = after.facilities.find((item) => item.id === facility.id);
      return next && JSON.stringify(next) !== JSON.stringify(facility);
    });
    const facilityAfter = facilityBefore ? after.facilities.find((facility) => facility.id === facilityBefore.id)! : undefined;
    if (facilityBefore && facilityAfter) {
      if (JSON.stringify(facilityBefore.hours) !== JSON.stringify(facilityAfter.hours)) {
        const weekday = new Date(after.now).getDay();
        const closingTime = facilityAfter.hours.find((hours) => hours.weekday === weekday)?.closingTime;
        await request(`/tenants/${tenant}/staff/facilities/${facilityAfter.id}/hours`, {
          method: 'PATCH', body: JSON.stringify({ closingTime }),
        }, tenant);
      } else if (!facilityBefore.specialClosure && facilityAfter.specialClosure) {
        const durationMinutes = Math.max(1, Math.round((Date.parse(facilityAfter.specialClosure.endsAt) - Date.parse(facilityAfter.specialClosure.startsAt)) / 60_000));
        await request(`/tenants/${tenant}/staff/facilities/${facilityAfter.id}/closure`, {
          method: 'PUT', body: JSON.stringify({ durationMinutes, reason: facilityAfter.specialClosure.reason }),
        }, tenant);
      } else if (facilityBefore.specialClosure && !facilityAfter.specialClosure) {
        await request(`/tenants/${tenant}/staff/facilities/${facilityAfter.id}/closure`, { method: 'DELETE' }, tenant);
      }
      return true;
    }

    if (JSON.stringify(before.university) !== JSON.stringify(after.university)) {
      await request(`/tenants/${tenant}/admin/settings`, {
        method: 'PATCH',
        body: JSON.stringify({
          primaryColor: after.university.primaryColor,
          accentColor: after.university.accentColor,
          privacyCountThreshold: after.university.privacyCountThreshold,
          autoCloseGraceMinutes: after.university.autoCloseGraceMinutes,
        }),
      }, tenant);
      return true;
    }
    return false;
  };

  return {
    mode,
    isEnabled: mode !== 'local',
    hasSession: (tenant: TenantSlug) => Boolean(readSession(tenant)),
    getCachedUser: (tenant: TenantSlug) => readSession(tenant)?.currentUser,
    async listDemoAccounts(tenant: TenantSlug): Promise<UserProfile[]> {
      if (mode === 'local') return demoAccounts[tenant];
      const payload = object(await request(`/tenants/${tenant}/demo-accounts`));
      return array(payload.accounts).map(mapProfile);
    },
    async signInDemo(tenant: TenantSlug, userId: string): Promise<UserProfile> {
      if (mode === 'local') return demoAccounts[tenant].find((account) => account.id === userId) ?? createDemoState(tenant).currentUser;
      const payload = object(await request('/auth/demo/session', {
        method: 'POST', body: JSON.stringify({ tenant, userId }),
      }));
      const currentUser = mapProfile(payload.currentUser);
      writeSession(tenant, string(payload.accessToken), currentUser);
      return currentUser;
    },
    async signOut(tenant: TenantSlug): Promise<void> {
      if (readSession(tenant)) await request('/auth/session', { method: 'DELETE' }, tenant).catch(() => undefined);
      sessions.delete(tenant);
      try { storage?.removeItem(sessionKey(tenant)); } catch { /* Memory session was cleared. */ }
    },
    loadTenantState,
    getParticipation,
    syncTenantChange,
    async runDemoAction(tenant: TenantSlug, action: string): Promise<void> {
      await request(`/tenants/${tenant}/demo/actions`, { method: 'POST', body: JSON.stringify({ action }) }, tenant);
    },
    async resetDemo(tenant: TenantSlug): Promise<void> {
      await request(`/tenants/${tenant}/demo/reset`, { method: 'POST' }, tenant);
    },
  };
};

export const campusFitApi = createCampusFitApi();

export const apiCatalogFallback = {
  activities: localActivities,
  workoutFocuses: localWorkoutFocuses,
};
