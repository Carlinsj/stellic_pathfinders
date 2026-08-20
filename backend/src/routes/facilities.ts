import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { authenticateRequest, AuthenticationError,} from '../plugins/auth.js';
import { supabaseAdmin } from '../plugins/supabase.js';

const tenantParamsSchema = z.object({
  tenant: z.string().min(1),
});

const facilityParamsSchema = z.object({
  tenant: z.string().min(1),
  facilityId: z.string().min(1),
});

const querySchema = z.object({
  at: z.string().datetime().optional(),
  intent: z.enum(['workout', 'activity']).optional(),
});

export const facilityRoutes: FastifyPluginAsync = async (app) => {
  app.get('/tenants/:tenant/facilities', async (request, reply) => {
    try {
      const { tenant } =
        tenantParamsSchema.parse(request.params);

      querySchema.parse(request.query);

      const { user } =
        await authenticateRequest(request);

      const db = supabaseAdmin;

      const {
        data: university,
        error: universityError,
      } = await db
        .from('universities')
        .select('*')
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

      const { data: facilities, error } = await db
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
        .eq('university_id', university.id)
        .eq('active', true)
        .order('name');

      if (error) {
        throw error;
      }

      return {
        facilities: facilities ?? [],
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
        error: 'FACILITIES_FAILED',
        message: 'Could not load facilities',
      });
    }
  });

  app.get(
    '/tenants/:tenant/facilities/:facilityId',
    async (request, reply) => {
      try {
        const { tenant, facilityId } =
          facilityParamsSchema.parse(request.params);

        querySchema
          .pick({ at: true })
          .parse(request.query);

        const { user } =
          await authenticateRequest(request);

        const db = supabaseAdmin;

        const {
          data: university,
          error: universityError,
        } = await db
          .from('universities')
          .select('*')
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

        const { data: facility, error } = await db
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
          .eq('id', facilityId)
          .eq('university_id', university.id)
          .eq('active', true)
          .single();

        if (error || !facility) {
          return reply.code(404).send({
            error: 'FACILITY_NOT_FOUND',
            message: 'Facility not found',
          });
        }

        const { data: forecasts, error: forecastError } =
          await db
            .from('demand_forecasts')
            .select('*')
            .eq('university_id', university.id)
            .eq('facility_id', facilityId)
            .order('interval_start')
            .limit(1);

        if (forecastError) {
          throw forecastError;
        }

        return {
          facility,
          forecast: forecasts?.[0] ?? null,
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
          error: 'FACILITY_FAILED',
          message: 'Could not load facility',
        });
      }
    },
  );
};