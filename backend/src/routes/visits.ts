import type { FastifyPluginAsync } from 'fastify';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

import {
  authenticateRequest,
  AuthenticationError,
} from '../plugins/auth.js';

import { supabaseAdmin } from '../plugins/supabase.js';
import { requireTenantAccess } from '../services/tenantAccess.js';
import { requireRole } from '../services/authorization.js';
import { databaseIdSchema } from '../services/validation.js';

const tenantSchema = z.object({
  tenant: z.string().min(1),
});

const visitParamsSchema = z.object({
  tenant: z.string().min(1),
  visitId: databaseIdSchema,
});

const visitStatusSchema = z.enum([
  'planned',
  'delayed',
  'checked_in',
  'completed',
  'cancelled',
  'expired',
  'auto_closed',
]);

const createVisitSchema = z
  .object({
    mode: z.enum(['plan', 'check_in']),

    facilityId: databaseIdSchema,

    plannedArrivalAt: z
      .string()
      .datetime()
      .optional(),

    intent: z.enum([
      'workout',
      'activity',
    ]),

    workoutFocuses: z
      .array(z.string())
      .default([]),

    activity: z.string().optional(),

    equipmentNeeds: z
      .array(z.string())
      .default([]),

    expectedDurationMinutes: z
      .number()
      .int()
      .min(5)
      .max(480),

    privacyLevel: z
      .literal('anonymous_aggregate')
      .default('anonymous_aggregate'),
  })
  .superRefine((value, ctx) => {
    if (
      value.mode === 'plan' &&
      !value.plannedArrivalAt
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'plannedArrivalAt is required when mode is plan',
      });
    }

    if (
      value.intent === 'workout' &&
      value.workoutFocuses.length === 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'At least one workout focus is required',
      });
    }

    if (
      value.intent === 'activity' &&
      !value.activity
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'activity is required for activity visits',
      });
    }
  });

const updateVisitSchema = z.object({
  action: z.enum([
    'reschedule',
    'check_in',
    'complete',
    'extend',
    'cancel',
    'change_facility',
    'change_workout_focuses',
    'change_activity',
  ]),

  plannedArrivalAt: z
    .string()
    .datetime()
    .optional(),

  expectedEndAt: z
    .string()
    .datetime()
    .optional(),

  facilityId: databaseIdSchema.optional(),

  workoutFocuses: z
    .array(z.string())
    .optional(),

  activity: z
    .string()
    .nullable()
    .optional(),

  crowdFeedback: z
    .enum([
      'less_busy',
      'about_as_expected',
      'more_busy',
    ])
    .optional(),
});


// --------------------
// Helper functions
// --------------------

interface IdKey { id: string; key: string }

async function resolveWorkoutFocuses(
  db: SupabaseClient,
  universityId: string,
  keys: string[],
): Promise<IdKey[]> {
  if (keys.length === 0) {
    return [];
  }

  const { data, error } = await db
    .from('workout_focuses')
    .select('id, key')
    .eq('university_id', universityId)
    .in('key', keys);

  if (error) {
    throw error;
  }

  if ((data?.length ?? 0) !== keys.length) {
    throw new Error(
      'One or more workout focuses are invalid',
    );
  }

  return data ?? [];
}

async function resolveActivity(
  db: SupabaseClient,
  universityId: string,
  key: string,
) {
  const { data, error } = await db
    .from('activities')
    .select('id, key')
    .eq('university_id', universityId)
    .eq('key', key)
    .eq('active', true)
    .single();

  if (error || !data) {
    throw new Error('Invalid activity');
  }

  return data;
}

async function resolveEquipmentNeeds(
  db: SupabaseClient,
  universityId: string,
  keys: string[],
): Promise<IdKey[]> {
  if (keys.length === 0) {
    return [];
  }

  const { data, error } = await db
    .from('equipment_types')
    .select('id, key')
    .eq('university_id', universityId)
    .in('key', keys);

  if (error) {
    throw error;
  }

  if ((data?.length ?? 0) !== keys.length) {
    throw new Error(
      'One or more equipment needs are invalid',
    );
  }

  return data ?? [];
}

async function ensureFacilitySupportsActivity(
  db: SupabaseClient,
  universityId: string,
  facilityId: string,
  activityId: string,
) {
  const { data, error } = await db.from('facility_activities').select('facility_id')
    .eq('university_id', universityId)
    .eq('facility_id', facilityId)
    .eq('activity_id', activityId)
    .neq('availability', 'unavailable')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Activity is not supported at this facility');
}


// --------------------
// Routes
// --------------------

export const visitRoutes: FastifyPluginAsync =
  async (app) => {
    app.get(
      '/tenants/:tenant/me/visits',
      async (request, reply) => {
        try {
          const { tenant } =
            tenantSchema.parse(request.params);

          const querySchema = z.object({
            status: z
              .union([
                visitStatusSchema,
                z.array(visitStatusSchema),
              ])
              .optional(),
          });

          const query =
            querySchema.parse(request.query);

          const { user } = await authenticateRequest(request);

          const db = supabaseAdmin;

          const { university } =
            await requireTenantAccess(
              db,
              user.id,
              tenant,
              user.universityId,
            );

          let databaseQuery = db
            .from('visits')
            .select(`
              *,
              facilities(
                id,
                name,
                short_name
              ),
              primary_workout_focus:workout_focuses!visits_primary_workout_focus_id_fkey(
                id,
                key,
                display_name
              ),
              activities(
                id,
                key,
                display_name
              ),
              visit_secondary_focuses(
                workout_focus_id,
                workout_focuses(
                  id,
                  key,
                  display_name
                )
              ),
              visit_equipment_needs(
                equipment_type_id,
                equipment_types(
                  id,
                  key,
                  display_name
                )
              )
            `)
            .eq(
              'university_id',
              university.id,
            )
            .eq('user_id', user.id);

          if (query.status) {
            const statuses =
              Array.isArray(query.status)
                ? query.status
                : [query.status];

            databaseQuery =
              databaseQuery.in(
                'status',
                statuses,
              );
          }

          const { data, error } =
            await databaseQuery.order(
              'created_at',
              {
                ascending: false,
              },
            );

          if (error) {
            throw error;
          }

          return {
            visits: data ?? [],
          };
        } catch (error) {
          if (
            error instanceof AuthenticationError
          ) {
            return reply.code(401).send({
              error: 'UNAUTHORIZED',
              message: error.message,
            });
          }

          request.log.error(error);

          return reply.code(500).send({
            error: 'VISITS_FAILED',
            message:
              'Could not load visits',
          });
        }
      },
    );

    app.post(
      '/tenants/:tenant/me/visits',
      async (request, reply) => {
        try {
          const { tenant } =
            tenantSchema.parse(request.params);

          const body =
            createVisitSchema.parse(
              request.body,
            );

          const { user } = await authenticateRequest(request);

          const db = supabaseAdmin;

          const { university, profile } =
            await requireTenantAccess(
              db,
              user.id,
              tenant,
              user.universityId,
            );
          requireRole(profile.role, ['student']);

          /*
           * Make sure facility belongs to tenant.
           */
          const {
            data: facility,
            error: facilityError,
          } = await db
            .from('facilities')
            .select('id')
            .eq('id', body.facilityId)
            .eq(
              'university_id',
              university.id,
            )
            .eq('active', true)
            .single();

          if (facilityError || !facility) {
            return reply.code(404).send({
              error:
                'FACILITY_NOT_FOUND',
              message:
                'Facility not found',
            });
          }

          const focuses =
            await resolveWorkoutFocuses(
              db,
              university.id,
              body.workoutFocuses,
            );

          let activityId: string | null =
            null;

          if (body.activity) {
            const activity =
              await resolveActivity(
                db,
                university.id,
                body.activity,
              );

            activityId = activity.id;
            await ensureFacilitySupportsActivity(db, university.id, body.facilityId, activity.id);
          }

          const equipment =
            await resolveEquipmentNeeds(
              db,
              university.id,
              body.equipmentNeeds,
            );

          const now = new Date();

          const expectedEnd = new Date(
            now.getTime() +
              body.expectedDurationMinutes *
                60_000,
          );

          const status =
            body.mode === 'check_in'
              ? 'checked_in'
              : 'planned';

          const primaryFocus =
            focuses[0]?.id ?? null;

          const insert = {
            university_id:
              university.id,

            user_id: user.id,

            facility_id:
              body.facilityId,

            status,

            source:
              body.mode === 'check_in'
                ? 'spontaneous'
                : 'planned',

            intent: body.intent,

            planned_arrival_at:
              body.mode === 'plan'
                ? body.plannedArrivalAt
                : null,

            original_planned_arrival_at:
              body.mode === 'plan'
                ? body.plannedArrivalAt
                : null,

            checked_in_at:
              body.mode === 'check_in'
                ? now.toISOString()
                : null,

            expected_duration_minutes:
              body.expectedDurationMinutes,

            expected_end_at:
              body.mode === 'check_in'
                ? expectedEnd.toISOString()
                : null,

            auto_close_at:
              body.mode === 'check_in'
                ? new Date(expectedEnd.getTime() + university.auto_close_grace_minutes * 60_000).toISOString()
                : null,

            last_activity_at:
              body.mode === 'check_in'
                ? now.toISOString()
                : null,

            primary_workout_focus_id:
              body.intent === 'workout'
                ? primaryFocus
                : null,

            activity_id:
              activityId,

            privacy_level:
              'anonymous_aggregate',
          };

          const {
            data: visit,
            error: visitError,
          } = await db
            .from('visits')
            .insert(insert)
            .select('*')
            .single();

          if (visitError || !visit) {
            throw visitError;
          }

          /*
           * Secondary workout focuses.
           */
          if (focuses.length > 1) {
            const secondaryRows =
              focuses
                .slice(1)
                .map((focus) => ({
                  university_id:
                    university.id,
                  visit_id: visit.id,
                  workout_focus_id:
                    focus.id,
                }));

            const { error } = await db
              .from(
                'visit_secondary_focuses',
              )
              .insert(secondaryRows);

            if (error) {
              throw error;
            }
          }

          /*
           * Equipment needs.
           */
          if (equipment.length > 0) {
            const equipmentRows =
              equipment.map((item) => ({
                university_id:
                  university.id,
                visit_id: visit.id,
                equipment_type_id:
                  item.id,
              }));

            const { error } = await db
              .from(
                'visit_equipment_needs',
              )
              .insert(equipmentRows);

            if (error) {
              throw error;
            }
          }

          return reply.code(201).send({
            visit,
          });
        } catch (error) {
          if (
            error instanceof AuthenticationError
          ) {
            return reply.code(401).send({
              error: 'UNAUTHORIZED',
              message: error.message,
            });
          }

          if (error instanceof z.ZodError) {
            return reply.code(400).send({
              error: 'INVALID_VISIT',
              issues: error.issues,
            });
          }

          if (
            error instanceof Error &&
            error.message === 'ROLE_ACCESS_DENIED'
          ) {
            return reply.code(403).send({
              error: 'FORBIDDEN',
              message: 'Student access is required',
            });
          }

          request.log.error(error);

          return reply.code(500).send({
            error:
              'VISIT_CREATE_FAILED',
            message:
              'Could not create visit',
          });
        }
      },
    );

    app.patch(
      '/tenants/:tenant/me/visits/:visitId',
      async (request, reply) => {
        try {
          const {
            tenant,
            visitId,
          } =
            visitParamsSchema.parse(
              request.params,
            );

          const body =
            updateVisitSchema.parse(
              request.body,
            );

          const { user } = await authenticateRequest(request);

          const db = supabaseAdmin;

          const { university } =
            await requireTenantAccess(
              db,
              user.id,
              tenant,
              user.universityId,
            );

          const {
            data: visit,
            error: visitError,
          } = await db
            .from('visits')
            .select('*')
            .eq('id', visitId)
            .eq(
              'university_id',
              university.id,
            )
            .eq('user_id', user.id)
            .single();

          if (visitError || !visit) {
            return reply.code(404).send({
              error: 'VISIT_NOT_FOUND',
              message:
                'Visit not found',
            });
          }

          /*
           * Closed visits never reopen.
           */
          const closedStatuses = [
            'completed',
            'cancelled',
            'expired',
            'auto_closed',
          ];

          if (
            closedStatuses.includes(
              visit.status,
            )
          ) {
            return reply.code(409).send({
              error: 'VISIT_CLOSED',
              message:
                'Closed visits cannot be modified',
            });
          }

          const updates: Record<
            string,
            unknown
          > = {
            updated_at:
              new Date().toISOString(),
          };

          const now =
            new Date().toISOString();

          switch (body.action) {
            case 'reschedule': {
              if (
                ![
                  'planned',
                  'delayed',
                ].includes(visit.status)
              ) {
                return reply
                  .code(409)
                  .send({
                    error:
                      'INVALID_TRANSITION',
                  });
              }

              if (!body.plannedArrivalAt) {
                return reply
                  .code(400)
                  .send({
                    error:
                      'PLANNED_ARRIVAL_REQUIRED',
                  });
              }

              updates.status =
                'delayed';

              updates.planned_arrival_at =
                body.plannedArrivalAt;

              break;
            }

            case 'check_in': {
              if (
                ![
                  'planned',
                  'delayed',
                ].includes(visit.status)
              ) {
                return reply
                  .code(409)
                  .send({
                    error:
                      'INVALID_TRANSITION',
                  });
              }

              updates.status =
                'checked_in';

              updates.checked_in_at =
                now;

              updates.last_activity_at =
                now;

              const expectedEnd =
                new Date(
                  Date.now() +
                    visit.expected_duration_minutes *
                      60_000,
                );

              updates.expected_end_at =
                expectedEnd.toISOString();

              updates.auto_close_at =
                new Date(expectedEnd.getTime() + university.auto_close_grace_minutes * 60_000).toISOString();

              break;
            }

            case 'complete': {
              if (
                visit.status !==
                'checked_in'
              ) {
                return reply
                  .code(409)
                  .send({
                    error:
                      'INVALID_TRANSITION',
                  });
              }

              updates.status =
                'completed';

              updates.checked_out_at =
                now;

              updates.last_activity_at =
                now;

              if (
                body.crowdFeedback
              ) {
                updates.crowd_feedback =
                  body.crowdFeedback;
              }

              break;
            }

            case 'extend': {
              if (
                visit.status !==
                'checked_in'
              ) {
                return reply
                  .code(409)
                  .send({
                    error:
                      'INVALID_TRANSITION',
                  });
              }

              if (!body.expectedEndAt) {
                return reply
                  .code(400)
                  .send({
                    error:
                      'EXPECTED_END_REQUIRED',
                  });
              }

              updates.expected_end_at =
                body.expectedEndAt;

              updates.auto_close_at = new Date(
                Date.parse(body.expectedEndAt) + university.auto_close_grace_minutes * 60_000,
              ).toISOString();

              if (visit.checked_in_at) {
                updates.expected_duration_minutes = Math.max(
                  5,
                  Math.round((Date.parse(body.expectedEndAt) - Date.parse(visit.checked_in_at)) / 60_000),
                );
              }

              updates.last_activity_at =
                now;

              break;
            }

            case 'cancel': {
              if (
                ![
                  'planned',
                  'delayed',
                ].includes(visit.status)
              ) {
                return reply
                  .code(409)
                  .send({
                    error:
                      'INVALID_TRANSITION',
                  });
              }

              updates.status =
                'cancelled';

              break;
            }

            case 'change_facility': {
              if (!body.facilityId) {
                return reply
                  .code(400)
                  .send({
                    error:
                      'FACILITY_REQUIRED',
                  });
              }

              const {
                data: facility,
              } = await db
                .from('facilities')
                .select('id')
                .eq(
                  'id',
                  body.facilityId,
                )
                .eq(
                  'university_id',
                  university.id,
                )
                .eq('active', true)
                .single();

              if (!facility) {
                return reply
                  .code(404)
                  .send({
                    error:
                      'FACILITY_NOT_FOUND',
                  });
              }

              if (visit.activity_id) {
                await ensureFacilitySupportsActivity(db, university.id, facility.id, visit.activity_id);
              }

              updates.facility_id =
                facility.id;

              break;
            }

            case 'change_workout_focuses': {
              if (
                !body.workoutFocuses ||
                body.workoutFocuses
                  .length === 0
              ) {
                return reply
                  .code(400)
                  .send({
                    error:
                      'WORKOUT_FOCUS_REQUIRED',
                  });
              }

              const focuses =
                await resolveWorkoutFocuses(
                  db,
                  university.id,
                  body.workoutFocuses,
                );

              updates.intent =
                'workout';

              updates.primary_workout_focus_id =
                focuses[0].id;

              await db
                .from('visit_secondary_focuses')
                .delete()
                .eq('visit_id', visitId)
                .eq('university_id', university.id);

              if (
                focuses.length > 1
              ) {
                await db
                  .from(
                    'visit_secondary_focuses',
                  )
                  .insert(
                    focuses
                      .slice(1)
                      .map(
                        (focus) => ({
                          university_id:
                            university.id,
                          visit_id:
                            visitId,
                          workout_focus_id:
                            focus.id,
                        }),
                      ),
                  );
              }

              break;
            }

            case 'change_activity': {
              if (!body.activity && visit.intent === 'activity') {
                return reply
                  .code(400)
                  .send({
                    error:
                      'ACTIVITY_REQUIRED',
                  });
              }

              if (body.activity) {
                const activity = await resolveActivity(db, university.id, body.activity);
                await ensureFacilitySupportsActivity(db, university.id, visit.facility_id, activity.id);
                updates.activity_id = activity.id;
              } else {
                updates.activity_id = null;
              }

              break;
            }
          }

          const previousStatus =
            visit.status;

          const {
            data: updatedVisit,
            error: updateError,
          } = await db
            .from('visits')
            .update(updates)
            .eq('id', visitId)
            .eq('university_id', university.id)
            .eq('user_id', user.id)
            .select('*')
            .single();

          if (
            updateError ||
            !updatedVisit
          ) {
            throw updateError;
          }

          /*
           * Record status transitions.
           */
          if (
            updatedVisit.status !==
            previousStatus
          ) {
            const { error } = await db
              .from(
                'visit_status_history',
              )
              .insert({
                university_id:
                  university.id,

                visit_id: visitId,

                previous_status:
                  previousStatus,

                new_status:
                  updatedVisit.status,

                reason:
                  body.action,

                changed_by:
                  user.id,
              });

            if (error) {
              request.log.error(error);
            }
          }

          return {
            visit: updatedVisit,
          };
        } catch (error) {
          if (
            error instanceof AuthenticationError
          ) {
            return reply.code(401).send({
              error: 'UNAUTHORIZED',
              message: error.message,
            });
          }

          if (error instanceof z.ZodError) {
            return reply.code(400).send({
              error:
                'INVALID_VISIT_UPDATE',
              issues: error.issues,
            });
          }

          request.log.error(error);

          return reply.code(500).send({
            error:
              'VISIT_UPDATE_FAILED',
            message:
              'Could not update visit',
          });
        }
      },
    );

    app.delete(
      '/tenants/:tenant/me/visits/:visitId',
      async (request, reply) => {
        try {
          const {
            tenant,
            visitId,
          } =
            visitParamsSchema.parse(
              request.params,
            );

          const { user } = await authenticateRequest(request);

          const db = supabaseAdmin;

          const { university } =
            await requireTenantAccess(
              db,
              user.id,
              tenant,
              user.universityId,
            );

          const {
            data: visit,
            error: visitError,
          } = await db
            .from('visits')
            .select(
              'id, user_id, university_id',
            )
            .eq('id', visitId)
            .eq(
              'university_id',
              university.id,
            )
            .eq('user_id', user.id)
            .single();

          if (visitError || !visit) {
            return reply.code(404).send({
              error: 'VISIT_NOT_FOUND',
              message:
                'Visit not found',
            });
          }

          const { error } = await db
            .from('visits')
            .delete()
            .eq('id', visitId)
            .eq('university_id', university.id)
            .eq('user_id', user.id);

          if (error) {
            throw error;
          }

          return reply
            .code(204)
            .send();
        } catch (error) {
          if (
            error instanceof AuthenticationError
          ) {
            return reply.code(401).send({
              error: 'UNAUTHORIZED',
              message: error.message,
            });
          }

          request.log.error(error);

          return reply.code(500).send({
            error:
              'VISIT_DELETE_FAILED',
            message:
              'Could not delete visit',
          });
        }
      },
    );
  };
