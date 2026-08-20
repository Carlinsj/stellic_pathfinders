import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import {
  authenticateRequest,
  AuthenticationError,
} from '../plugins/auth.js';

import { supabaseAdmin } from '../plugins/supabase.js';

const paramsSchema = z.object({
  tenant: z.string().min(1),
});

export const bootstrapRoutes: FastifyPluginAsync = async (app) => {
  app.get('/tenants/:tenant/bootstrap', async (request, reply) => {
    try {
      const { tenant } = paramsSchema.parse(request.params);

      const { user } =
        await authenticateRequest(request);

      const db = supabaseAdmin;

      // Confirm that the tenant in the URL matches
      // the university embedded in the demo JWT.
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

      // Load the selected demo user's profile.
      const {
        data: profile,
        error: profileError,
      } = await db
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .eq('university_id', university.id)
        .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      if (!profile) {
        return reply.code(404).send({
          error: 'USER_PROFILE_NOT_FOUND',
          message: 'User profile not found',
        });
      }

      const [
        facilitiesResult,
        activitiesResult,
        workoutFocusesResult,
        equipmentTypesResult,
        visitsResult,
        notificationsResult,
      ] = await Promise.all([
        db
          .from('facilities')
          .select('*')
          .eq('university_id', university.id)
          .eq('active', true)
          .order('name'),

        db
          .from('activities')
          .select('*')
          .eq('university_id', university.id)
          .eq('active', true)
          .order('display_name'),

        db
          .from('workout_focuses')
          .select('*')
          .eq('university_id', university.id)
          .eq('active', true)
          .order('display_name'),

        db
          .from('equipment_types')
          .select('*')
          .eq('university_id', university.id)
          .eq('active', true)
          .order('display_name'),

        db
          .from('visits')
          .select('*')
          .eq('university_id', university.id)
          .eq('user_id', user.id)
          .order('created_at', {
            ascending: false,
          }),

        db
          .from('notifications')
          .select('*')
          .eq('university_id', university.id)
          .eq('user_id', user.id)
          .order('created_at', {
            ascending: false,
          }),
      ]);

      const databaseError =
        facilitiesResult.error ??
        activitiesResult.error ??
        workoutFocusesResult.error ??
        equipmentTypesResult.error ??
        visitsResult.error ??
        notificationsResult.error;

      if (databaseError) {
        throw databaseError;
      }

      return {
        university,
        currentUser: profile,
        facilities: facilitiesResult.data ?? [],
        activities: activitiesResult.data ?? [],
        workoutFocuses: workoutFocusesResult.data ?? [],
        equipmentTypes: equipmentTypesResult.data ?? [],
        ownVisits: visitsResult.data ?? [],
        notifications: notificationsResult.data ?? [],
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
        error: 'BOOTSTRAP_FAILED',
        message: 'Could not load application data',
      });
    }
  });
};