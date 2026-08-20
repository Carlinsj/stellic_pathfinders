import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import {
  authenticateRequest,
  AuthenticationError,
} from '../plugins/auth.js';

import { supabaseAdmin } from '../plugins/supabase.js';

const paramsSchema = z.object({
  tenant: z.string().min(1),
  facilityId: z.string().min(1),
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

        const { user } =
          await authenticateRequest(request);

        const db = supabaseAdmin;

        // Verify that the tenant in the URL matches
        // the university stored in the demo JWT.
        const {
          data: university,
          error: universityError,
        } = await db
          .from('universities')
          .select('id, slug, active')
          .eq('slug', tenant)
          .eq('id', user.universityId)
          .eq('active', true)
          .maybeSingle();

        if (universityError) {
          throw universityError;
        }

        if (!university) {
          return reply.code(403).send({
            error: 'TENANT_ACCESS_DENIED',
            message: 'Tenant access denied',
          });
        }

        // Verify that the requested facility belongs
        // to the authenticated demo user's university.
        const {
          data: facility,
          error: facilityError,
        } = await db
          .from('facilities')
          .select('id, university_id')
          .eq('id', facilityId)
          .eq('university_id', university.id)
          .eq('active', true)
          .maybeSingle();

        if (facilityError) {
          throw facilityError;
        }

        if (!facility) {
          return reply.code(404).send({
            error: 'FACILITY_NOT_FOUND',
            message: 'Facility not found',
          });
        }

        const requestedAt =
          at ?? new Date().toISOString();

        const {
          data,
          error,
        } = await db.rpc(
          'get_facility_participation_tracker',
          {
            requested_university_id:
              university.id,

            requested_facility_id:
              facilityId,

            requested_at:
              requestedAt,
          },
        );

        if (error) {
          throw error;
        }

        const row =
          Array.isArray(data)
            ? data[0]
            : data;

        if (!row) {
          return reply.code(500).send({
            error: 'PARTICIPATION_UNAVAILABLE',
            message:
              'Participation data unavailable',
          });
        }

        return {
          universityId:
            row.university_id,

          facilityId:
            row.facility_id,

          intervalStart:
            row.interval_start,

          intervalEnd:
            row.interval_end,

          campusFitCheckIns:
            row.campusfit_check_ins,

          plannedCheckIns:
            row.planned_check_ins,

          walkInCheckIns:
            row.walk_in_check_ins,

          scheduledForWindow:
            row.scheduled_for_window,

          scheduledNotCheckedIn:
            row.scheduled_not_checked_in,

          typicalVisitorRange: [
            row.typical_visitor_range_low,
            row.typical_visitor_range_high,
          ],

          confidence:
            row.confidence,

          updatedAt:
            row.updated_at,

          sourceExplanation:
            row.source_explanation,

          officialOccupancyConnected:
            false,
        };
      } catch (error) {
        if (error instanceof AuthenticationError) {
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
          error: 'PARTICIPATION_FAILED',
          message:
            error instanceof Error
              ? error.message
              : 'Could not load participation data',
        });
      }
    },
  );
};