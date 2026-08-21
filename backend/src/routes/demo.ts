import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

import { env } from '../config/env.js';
import { authenticateRequest, AuthenticationError } from '../plugins/auth.js';
import { supabaseAdmin } from '../plugins/supabase.js';
import { requireRole } from '../services/authorization.js';
import { requireTenantAccess } from '../services/tenantAccess.js';

const paramsSchema = z.object({ tenant: z.string().min(1) });
const actionSchema = z.object({
  action: z.enum([
    'add_plan', 'check_in', 'delay_plan', 'check_out', 'move_visit',
    'add_squash', 'add_badminton', 'add_climbing', 'trigger_cable_outage',
  ]),
});

interface DemoUniversity {
  id: string;
  auto_close_grace_minutes: number;
}

interface DemoVisitRow extends Record<string, unknown> {
  id: string;
  facility_id: string;
  activity_id?: string | null;
  planned_arrival_at?: string | null;
}

async function demoContext(request: Parameters<typeof authenticateRequest>[0], tenant: string) {
  if (!env.DEMO_ENABLED) throw new Error('DEMO_DISABLED');
  const { user } = await authenticateRequest(request);
  const { university, profile } = await requireTenantAccess(
    supabaseAdmin, user.id, tenant, user.universityId,
  );
  requireRole(profile.role, ['university_admin', 'demo_admin', 'platform_admin']);
  return { db: supabaseAdmin, university, user };
}

async function getDemoStatus(db: SupabaseClient, universityId: string) {
  const [active, planned, syntheticActive, syntheticPlanned] = await Promise.all([
    db.from('visits').select('id', { count: 'exact', head: true })
      .eq('university_id', universityId).eq('status', 'checked_in'),
    db.from('visits').select('id', { count: 'exact', head: true })
      .eq('university_id', universityId).in('status', ['planned', 'delayed']),
    db.from('visits').select('id', { count: 'exact', head: true })
      .eq('university_id', universityId).eq('source', 'demo').eq('status', 'checked_in'),
    db.from('visits').select('id', { count: 'exact', head: true })
      .eq('university_id', universityId).eq('source', 'demo').eq('status', 'planned'),
  ]);
  if (active.error) throw active.error;
  if (planned.error) throw planned.error;
  if (syntheticActive.error) throw syntheticActive.error;
  if (syntheticPlanned.error) throw syntheticPlanned.error;
  return {
    universityId,
    activeCheckIns: active.count ?? 0,
    futurePlans: planned.count ?? 0,
    hasPlannedVisit: (syntheticPlanned.count ?? 0) > 0,
    hasSyntheticActiveVisit: (syntheticActive.count ?? 0) > 0,
    updatedAt: new Date().toISOString(),
  };
}

async function audit(
  db: SupabaseClient,
  universityId: string,
  actorId: string,
  action: string,
  targetType: string,
  targetId: string,
  metadata: Record<string, unknown> = {},
) {
  const { error } = await db.from('audit_events').insert({
    university_id: universityId,
    actor_id: actorId,
    action,
    target_type: targetType,
    target_id: targetId,
    metadata,
  });
  if (error) throw error;
}

async function findAvailableDemoUser(db: SupabaseClient, universityId: string) {
  const [profiles, active] = await Promise.all([
    db.from('user_profiles').select('id').eq('university_id', universityId)
      .like('email', 'synthetic.%@campusfit.invalid').limit(100),
    db.from('visits').select('user_id').eq('university_id', universityId).eq('status', 'checked_in'),
  ]);
  if (profiles.error) throw profiles.error;
  if (active.error) throw active.error;
  const activeUsers = new Set((active.data ?? []).map((visit) => visit.user_id));
  const profile = (profiles.data ?? []).find((item) => !activeUsers.has(item.id));
  if (!profile) throw new Error('No synthetic demo account is available');
  return profile.id;
}

async function findFacilityAndPurpose(
  db: SupabaseClient,
  universityId: string,
  activityKey?: string,
  focusKey = 'general_strength',
) {
  if (activityKey) {
    const { data: activity, error: activityError } = await db.from('activities').select('id')
      .eq('university_id', universityId).eq('key', activityKey).eq('active', true).single();
    if (activityError || !activity) throw activityError ?? new Error('Activity not found');
    const { data: availability, error } = await db.from('facility_activities').select('facility_id')
      .eq('university_id', universityId).eq('activity_id', activity.id)
      .neq('availability', 'unavailable').limit(1).single();
    if (error || !availability) throw error ?? new Error('Supporting facility not found');
    return { facilityId: availability.facility_id, activityId: activity.id, focusId: null, intent: 'activity' as const };
  }

  const [facilityResult, focusResult] = await Promise.all([
    db.from('facilities').select('id').eq('university_id', universityId).eq('active', true).order('name').limit(1).single(),
    db.from('workout_focuses').select('id').eq('university_id', universityId).eq('key', focusKey).eq('active', true).single(),
  ]);
  if (facilityResult.error || !facilityResult.data) throw facilityResult.error ?? new Error('Facility not found');
  if (focusResult.error || !focusResult.data) throw focusResult.error ?? new Error('Workout focus not found');
  return { facilityId: facilityResult.data.id, activityId: null, focusId: focusResult.data.id, intent: 'workout' as const };
}

async function createDemoVisit(
  db: SupabaseClient,
  university: DemoUniversity,
  actorId: string,
  mode: 'plan' | 'check_in',
  activityKey?: string,
) {
  const userId = await findAvailableDemoUser(db, university.id);
  const purpose = await findFacilityAndPurpose(db, university.id, activityKey);
  const now = new Date();
  const plannedArrival = new Date(now.getTime() + 30 * 60_000);
  const expectedEnd = new Date(now.getTime() + 60 * 60_000);
  const { data: visit, error } = await db.from('visits').insert({
    university_id: university.id,
    user_id: userId,
    facility_id: purpose.facilityId,
    status: mode === 'plan' ? 'planned' : 'checked_in',
    source: 'demo',
    intent: purpose.intent,
    planned_arrival_at: mode === 'plan' ? plannedArrival.toISOString() : null,
    original_planned_arrival_at: mode === 'plan' ? plannedArrival.toISOString() : null,
    checked_in_at: mode === 'check_in' ? now.toISOString() : null,
    expected_duration_minutes: 60,
    expected_end_at: mode === 'check_in' ? expectedEnd.toISOString() : null,
    auto_close_at: mode === 'check_in'
      ? new Date(expectedEnd.getTime() + university.auto_close_grace_minutes * 60_000).toISOString()
      : null,
    last_activity_at: mode === 'check_in' ? now.toISOString() : null,
    primary_workout_focus_id: purpose.focusId,
    activity_id: purpose.activityId,
    privacy_level: 'anonymous_aggregate',
  }).select('*').single();
  if (error || !visit) throw error ?? new Error('Demo visit was not created');
  await audit(db, university.id, actorId, 'demo_visit_created', 'visit', visit.id);
}

async function updateDemoVisit(
  db: SupabaseClient,
  universityId: string,
  actorId: string,
  statuses: string[],
  updater: (visit: DemoVisitRow) => Promise<Record<string, unknown>> | Record<string, unknown>,
) {
  const { data: visit, error } = await db.from('visits').select('*')
    .eq('university_id', universityId).eq('source', 'demo').in('status', statuses)
    .order('updated_at').limit(1).maybeSingle();
  if (error) throw error;
  if (!visit) throw new Error('No matching synthetic visit is available');
  const changes = await updater(visit as DemoVisitRow);
  const { error: updateError } = await db.from('visits').update({ ...changes, updated_at: new Date().toISOString() })
    .eq('id', visit.id).eq('university_id', universityId);
  if (updateError) throw updateError;
  await audit(db, universityId, actorId, 'demo_visit_updated', 'visit', visit.id, { previous: visit });
}

async function triggerCableOutage(db: SupabaseClient, universityId: string, actorId: string) {
  const { data: inventory, error } = await db.from('facility_equipment').select('*, equipment_types!inner(key)')
    .eq('university_id', universityId).eq('equipment_types.key', 'cable')
    .gte('operational_quantity', 2).order('facility_id').limit(1).maybeSingle();
  if (error) throw error;
  if (!inventory) throw new Error('No cable inventory can accept this outage');
  const { error: updateError } = await db.from('facility_equipment')
    .update({ operational_quantity: inventory.operational_quantity - 2, notes: 'Demo outage' })
    .eq('id', inventory.id).eq('operational_quantity', inventory.operational_quantity);
  if (updateError) throw updateError;
  const { data: outage, error: outageError } = await db.from('equipment_outages').insert({
    university_id: universityId,
    facility_equipment_id: inventory.id,
    started_at: new Date().toISOString(),
    reason: 'Demo outage',
    status: 'active',
  }).select('id').single();
  if (outageError || !outage) throw outageError ?? new Error('Demo outage was not recorded');
  await audit(db, universityId, actorId, 'demo_equipment_updated', 'facility_equipment', inventory.id, {
    previousOperationalQuantity: inventory.operational_quantity,
    outageId: outage.id,
  });
}

async function resetDemo(db: SupabaseClient, universityId: string, actorId: string) {
  const { data: events, error } = await db.from('audit_events').select('*')
    .eq('university_id', universityId).eq('actor_id', actorId)
    .in('action', ['demo_visit_created', 'demo_visit_updated', 'demo_equipment_updated'])
    .order('created_at', { ascending: false });
  if (error) throw error;
  for (const event of events ?? []) {
    const metadata = event.metadata && typeof event.metadata === 'object'
      ? event.metadata as Record<string, unknown>
      : {};
    if (event.action === 'demo_visit_created') {
      await db.from('visits').delete().eq('id', event.target_id).eq('university_id', universityId);
    } else if (event.action === 'demo_visit_updated' && metadata.previous && typeof metadata.previous === 'object') {
      const previous = Object.fromEntries(
        Object.entries(metadata.previous as Record<string, unknown>).filter(([key]) => key !== 'id'),
      );
      await db.from('visits').update(previous).eq('id', event.target_id).eq('university_id', universityId);
    } else if (event.action === 'demo_equipment_updated') {
      await db.from('facility_equipment').update({
        operational_quantity: Number(metadata.previousOperationalQuantity),
        notes: 'CampusFit deterministic seed',
      }).eq('id', event.target_id).eq('university_id', universityId);
      if (typeof metadata.outageId === 'string') await db.from('equipment_outages').delete().eq('id', metadata.outageId).eq('university_id', universityId);
    }
  }
  if ((events?.length ?? 0) > 0) {
    await db.from('audit_events').delete().in('id', events!.map((event) => event.id)).eq('university_id', universityId);
  }
}

function sendError(request: FastifyRequest, reply: FastifyReply, error: unknown) {
  if (error instanceof AuthenticationError) return reply.code(401).send({ error: 'UNAUTHORIZED' });
  if (error instanceof z.ZodError) return reply.code(400).send({ error: 'INVALID_DEMO_ACTION', issues: error.issues });
  if (error instanceof Error && error.message === 'ROLE_ACCESS_DENIED') return reply.code(403).send({ error: 'FORBIDDEN' });
  if (error instanceof Error && error.message === 'DEMO_DISABLED') return reply.code(404).send({ error: 'NOT_FOUND' });
  request.log.error(error);
  return reply.code(409).send({ error: 'DEMO_ACTION_FAILED', message: error instanceof Error ? error.message : 'Demo action failed' });
}

export const demoRoutes: FastifyPluginAsync = async (app) => {
  app.post('/tenants/:tenant/demo/actions', async (request, reply) => {
    try {
      const { tenant } = paramsSchema.parse(request.params);
      const { action } = actionSchema.parse(request.body);
      const { db, university, user } = await demoContext(request, tenant);
      if (action === 'add_plan') await createDemoVisit(db, university, user.id, 'plan');
      else if (action === 'check_in') await createDemoVisit(db, university, user.id, 'check_in');
      else if (action === 'add_squash') await createDemoVisit(db, university, user.id, 'check_in', 'squash');
      else if (action === 'add_badminton') await createDemoVisit(db, university, user.id, 'check_in', 'badminton');
      else if (action === 'add_climbing') await createDemoVisit(db, university, user.id, 'check_in', 'climbing');
      else if (action === 'delay_plan') await updateDemoVisit(db, university.id, user.id, ['planned'], (visit) => ({
        status: 'delayed',
        planned_arrival_at: new Date(Date.parse(visit.planned_arrival_at ?? '') + 20 * 60_000).toISOString(),
      }));
      else if (action === 'check_out') await updateDemoVisit(db, university.id, user.id, ['checked_in'], () => ({
        status: 'completed', checked_out_at: new Date().toISOString(), last_activity_at: new Date().toISOString(),
      }));
      else if (action === 'move_visit') await updateDemoVisit(db, university.id, user.id, ['checked_in'], async (visit) => {
        const { data: facilities, error } = await db.from('facilities').select('id')
          .eq('university_id', university.id).eq('active', true).order('name');
        if (error) throw error;
        let choices = facilities ?? [];
        if (visit.activity_id) {
          const { data: availability, error: availabilityError } = await db
            .from('facility_activities')
            .select('facility_id')
            .eq('university_id', university.id)
            .eq('activity_id', visit.activity_id)
            .neq('availability', 'unavailable');
          if (availabilityError) throw availabilityError;
          const supportedFacilityIds = new Set((availability ?? []).map((item) => item.facility_id));
          choices = choices.filter((facility) => supportedFacilityIds.has(facility.id));
        }
        const index = choices.findIndex((facility) => facility.id === visit.facility_id);
        const next = choices[(index + 1) % choices.length];
        if (!next || (choices.length === 1 && next.id === visit.facility_id)) {
          throw new Error('No alternate supporting facility is available');
        }
        return { facility_id: next.id };
      });
      else if (action === 'trigger_cable_outage') await triggerCableOutage(db, university.id, user.id);

      return { demoStatus: await getDemoStatus(db, university.id) };
    } catch (error) {
      return sendError(request, reply, error);
    }
  });

  app.post('/tenants/:tenant/demo/reset', async (request, reply) => {
    try {
      const { tenant } = paramsSchema.parse(request.params);
      const { db, university, user } = await demoContext(request, tenant);
      await resetDemo(db, university.id, user.id);
      return { demoStatus: await getDemoStatus(db, university.id) };
    } catch (error) {
      return sendError(request, reply, error);
    }
  });
};
