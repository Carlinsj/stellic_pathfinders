import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import {
  authenticateRequest,
  AuthenticationError,
} from '../plugins/auth.js';

import { createUserSupabase } from '../plugins/supabase.js';
import { requireTenantAccess } from '../services/tenantAccess.js';

const paramsSchema = z.object({
  tenant: z.string().min(1),
  facilityId: z.string().uuid(),
});

const querySchema = z.object({
  at: z.string().datetime().optional(),
});

export const participationRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/tenants/:tenant/facilities/:facilityId/participation',
    async (request, reply) => {
      try {
        const { tenant, facilityId } =
          paramsSchema.parse(request.params);

        const { at } =
          querySchema.parse(request.query);

        const { token, user } =
          await authenticateRequest(request);

        const db = createUserSupabase(token);

        const { university } =
          await requireTenantAccess(
            db,
            user.id,
            tenant,
          );

        const { data: facility, error: facilityError } =
          await db
            .from('facilities')
            .select('id, university_id')
            .eq('id', facilityId)
            .eq('university_id', university.id)
            .single();

        if (facilityError || !facility) {
          return reply.code(404).send({
            error: 'FACILITY_NOT_FOUND',
            message: 'Facility not found',
          });
        }

        const { data, error } = await db.rpc(
          'get_facility_participation_tracker',
          {
            requested_facility_id: facilityId,
            requested_at:
              at ?? new Date().toISOString(),
          },
        );

        if (error) {
          throw error;
        }

        const row = Array.isArray(data)
          ? data[0]
          : data;

        if (!row) {
          return reply.code(500).send({
            error: 'PARTICIPATION_UNAVAILABLE',
            message: 'Participation data unavailable',
          });
        }

        return {
          universityId: row.university_id,
          facilityId: row.facility_id,
          intervalStart: row.interval_start,
          intervalEnd: row.interval_end,
          campusFitCheckIns: row.campusfit_check_ins,
          plannedCheckIns: row.planned_check_ins,
          walkInCheckIns: row.walk_in_check_ins,
          scheduledForWindow: row.scheduled_for_window,
          scheduledNotCheckedIn:
            row.scheduled_not_checked_in,

          typicalVisitorRange: [
            row.typical_visitor_range_low,
            row.typical_visitor_range_high,
          ],

          confidence: row.confidence,
          updatedAt: row.updated_at,
          sourceExplanation: row.source_explanation,

          officialOccupancyConnected: false,
        };
      } catch (error) {
        if (error instanceof AuthenticationError) {
          return reply.code(401).send({
            error: 'UNAUTHORIZED',
            message: error.message,
          });
        }

        request.log.error(error);

        return reply.code(500).send({
          error: 'PARTICIPATION_FAILED',
          message: 'Could not load participation data',
        });
      }
    },
  );
};