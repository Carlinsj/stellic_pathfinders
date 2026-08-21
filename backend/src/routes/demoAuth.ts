import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { supabaseAdmin } from '../plugins/supabase.js';
import { env } from '../config/env.js';

const tenantParamsSchema = z.object({ tenant: z.string().min(1) });

const demoSessionSchema = z.object({
  tenant: z.string().min(1),
  userId: z.string().min(1),
});

export const demoAuthRoutes: FastifyPluginAsync =
  async (app) => {
    app.get('/tenants/:tenant/demo-accounts', async (request, reply) => {
      if (!env.DEMO_ENABLED) return reply.code(404).send({ error: 'NOT_FOUND' });
      try {
        const { tenant } = tenantParamsSchema.parse(request.params);
        const { data: university, error: universityError } = await supabaseAdmin
          .from('universities').select('id').eq('slug', tenant).eq('active', true).single();
        if (universityError || !university) return reply.code(404).send({ error: 'TENANT_NOT_FOUND' });

        const { data, error } = await supabaseAdmin.from('user_profiles').select(`
          id, university_id, full_name, email, role, preferred_facility_id, default_privacy_level
        `).eq('university_id', university.id).order('full_name');
        if (error) throw error;
        const accounts = (data ?? [])
          .filter((profile) => !profile.email.endsWith('@campusfit.invalid'))
          .map((profile) => ({
            id: profile.id,
            universityId: profile.university_id,
            fullName: profile.full_name,
            email: profile.email,
            role: profile.role,
            preferredFacilityId: profile.preferred_facility_id ?? undefined,
            defaultPrivacyLevel: profile.default_privacy_level,
          }));
        return { accounts };
      } catch (error) {
        if (error instanceof z.ZodError) return reply.code(400).send({ error: 'INVALID_REQUEST', issues: error.issues });
        request.log.error(error);
        return reply.code(500).send({ error: 'DEMO_ACCOUNTS_FAILED' });
      }
    });

    app.post(
      '/auth/demo/session',
      async (request, reply) => {
        if (!env.DEMO_ENABLED) return reply.code(404).send({ error: 'NOT_FOUND' });
        try {
          const body =
            demoSessionSchema.parse(
              request.body,
            );

          const {
            data: university,
            error: universityError,
          } = await supabaseAdmin
            .from('universities')
            .select('id, slug')
            .eq('slug', body.tenant)
            .eq('active', true)
            .single();

          if (
            universityError ||
            !university
          ) {
            return reply.code(404).send({
              error: 'TENANT_NOT_FOUND',
            });
          }

          const {
            data: profile,
            error: profileError,
          } = await supabaseAdmin
            .from('user_profiles')
            .select(`
              id,
              university_id,
              full_name,
              email,
              role,
              preferred_facility_id,
              default_privacy_level
            `)
            .eq('id', body.userId)
            .eq(
              'university_id',
              university.id,
            )
            .single();

          if (
            profileError ||
            !profile
          ) {
            return reply.code(404).send({
              error:
                'DEMO_PROFILE_NOT_FOUND',
            });
          }

          const accessToken =
            app.jwt.sign(
              {
                sub: profile.id,
                universityId:
                  profile.university_id,
                role:
                  profile.role,
                demo: true,
              },
              {
                expiresIn: '8h',
              },
            );

          return {
            currentUser: profile,
            accessToken,
          };
        } catch (error) {
          if (error instanceof z.ZodError) {
            return reply.code(400).send({
              error:
                'INVALID_DEMO_SESSION_REQUEST',
              issues: error.issues,
            });
          }

          request.log.error(error);

          return reply.code(500).send({
            error:
              'DEMO_SESSION_FAILED',
          });
        }
      },
    );
  };
