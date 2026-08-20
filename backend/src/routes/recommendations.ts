import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import {
  authenticateRequest,
  AuthenticationError,
} from '../plugins/auth.js';

import { supabaseAdmin } from '../plugins/supabase.js';
import { requireTenantAccess } from '../services/tenantAccess.js';

const paramsSchema = z.object({
  tenant: z.string().min(1),
});

const querySchema = z
  .object({
    at: z.string().datetime(),
    intent: z.enum(['workout', 'activity']),

    workoutFocuses: z
      .union([z.string(), z.array(z.string())])
      .optional(),

    activity: z.string().optional(),

    expectedDurationMinutes: z.coerce
      .number()
      .int()
      .min(5)
      .max(480),

    equipmentNeeds: z
      .union([z.string(), z.array(z.string())])
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (
      value.intent === 'workout' &&
      !value.workoutFocuses
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'workoutFocuses is required for workout intent',
      });
    }

    if (
      value.intent === 'activity' &&
      !value.activity
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'activity is required for activity intent',
      });
    }
  });

function normalizeArray(
  value: string | string[] | undefined,
): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value;
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export const recommendationRoutes: FastifyPluginAsync =
  async (app) => {
    app.get(
      '/tenants/:tenant/recommendations',
      async (request, reply) => {
        try {
          const { tenant } =
            paramsSchema.parse(request.params);

          const query =
            querySchema.parse(request.query);

          const workoutFocuses = normalizeArray(
            query.workoutFocuses,
          );

          const equipmentNeeds = normalizeArray(
            query.equipmentNeeds,
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

          /*
           * Start with tenant facilities and their
           * student-safe catalogue information.
           */
          const { data: facilities, error } =
            await db
              .from('facilities')
              .select(`
                *,
                facility_operating_hours(*),
                facility_activities(
                  *,
                  activities(*)
                ),
                facility_equipment(
                  *,
                  equipment_types(*)
                )
              `)
              .eq(
                'university_id',
                university.id,
              )
              .eq('active', true);

          if (error) {
            throw error;
          }

          /*
           * Fetch forecasts overlapping the requested
           * planning time.
           */
          const { data: forecasts, error: forecastError } =
            await db
              .from('demand_forecasts')
              .select('*')
              .eq(
                'university_id',
                university.id,
              )
              .lte(
                'interval_start',
                query.at,
              )
              .gt(
                'interval_end',
                query.at,
              );

          if (forecastError) {
            throw forecastError;
          }

          let eligible = facilities ?? [];

          /*
           * Activity eligibility.
           */
          if (
            query.intent === 'activity' &&
            query.activity
          ) {
            eligible = eligible.filter((facility) =>
              facility.facility_activities?.some(
                (item: any) =>
                  item.activities?.key ===
                    query.activity &&
                  item.availability !==
                    'unavailable',
              ),
            );
          }

          /*
           * Equipment eligibility.
           */
          if (equipmentNeeds.length > 0) {
            eligible = eligible.filter(
              (facility) =>
                equipmentNeeds.every(
                  (equipmentKey) =>
                    facility.facility_equipment?.some(
                      (item: any) =>
                        item.equipment_types?.key ===
                          equipmentKey &&
                        item.operational_quantity > 0,
                    ),
                ),
            );
          }

          /*
           * Simple first-pass ranking.
           *
           * Later you should move the richer logic from
           * src/services/recommendation.ts into shared/
           * or backend/services.
           */
          const recommendations = eligible
            .map((facility) => {
              const forecast =
                forecasts?.find(
                  (item) =>
                    item.facility_id === facility.id,
                ) ?? null;

              return {
                facility,
                forecast,

                requestedAt: query.at,
                intent: query.intent,
                workoutFocuses,
                activity:
                  query.activity ?? null,
                expectedDurationMinutes:
                  query.expectedDurationMinutes,

                equipmentNeeds,

                score:
                  forecast?.expected_range_high ??
                  Number.MAX_SAFE_INTEGER,
              };
            })
            .sort(
              (a, b) => a.score - b.score,
            );

          return {
            recommendations,
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
              error: 'INVALID_REQUEST',
              issues: error.issues,
            });
          }

          request.log.error(error);

          return reply.code(500).send({
            error:
              'RECOMMENDATIONS_FAILED',
            message:
              'Could not generate recommendations',
          });
        }
      },
    );
  };