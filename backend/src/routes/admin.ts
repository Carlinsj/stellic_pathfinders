import type {
  FastifyPluginAsync,
} from 'fastify';

import { z } from 'zod';

import {
  authenticateRequest,
  AuthenticationError,
} from '../plugins/auth.js';

import {
  createUserSupabase,
} from '../plugins/supabase.js';

import {
  requireTenantAccess,
} from '../services/tenantAccess.js';

import {
  requireRole,
} from '../services/authorization.js';

const paramsSchema = z.object({
  tenant: z.string().min(1),
});

const settingsSchema = z
  .object({
    primaryColor: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/)
      .optional(),

    accentColor: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/)
      .optional(),

    privacyCountThreshold: z
      .number()
      .int()
      .min(3)
      .max(10)
      .optional(),

    autoCloseGraceMinutes: z
      .number()
      .int()
      .min(10)
      .max(90)
      .optional(),
  })
  .refine(
    (body) =>
      Object.keys(body).length > 0,
    {
      message:
        'At least one setting must be supplied',
    },
  );

export const adminRoutes:
  FastifyPluginAsync =
  async (app) => {
    app.patch(
      '/tenants/:tenant/admin/settings',
      async (request, reply) => {
        try {
          const { tenant } =
            paramsSchema.parse(
              request.params,
            );

          const body =
            settingsSchema.parse(
              request.body,
            );

          const { token, user } =
            await authenticateRequest(
              request,
            );

          const db =
            createUserSupabase(token);

          const {
            university,
            profile,
          } =
            await requireTenantAccess(
              db,
              user.id,
              tenant,
            );

          requireRole(
            profile.role,
            [
              'university_admin',
              'platform_admin',
            ],
          );

          const updates: Record<
            string,
            unknown
          > = {
            updated_at:
              new Date()
                .toISOString(),
          };

          if (
            body.primaryColor !==
            undefined
          ) {
            updates.primary_colour =
              body.primaryColor;
          }

          if (
            body.accentColor !==
            undefined
          ) {
            updates.accent_colour =
              body.accentColor;
          }

          if (
            body
              .privacyCountThreshold !==
            undefined
          ) {
            updates
              .privacy_count_threshold =
              body
                .privacyCountThreshold;
          }

          if (
            body
              .autoCloseGraceMinutes !==
            undefined
          ) {
            updates
              .auto_close_grace_minutes =
              body
                .autoCloseGraceMinutes;
          }

          const {
            data: updatedUniversity,
            error,
          } = await db
            .from('universities')
            .update(updates)
            .eq(
              'id',
              university.id,
            )
            .select('*')
            .single();

          if (
            error ||
            !updatedUniversity
          ) {
            throw error;
          }

          return {
            university:
              updatedUniversity,
          };
        } catch (error) {
          if (
            error instanceof
            AuthenticationError
          ) {
            return reply
              .code(401)
              .send({
                error:
                  'UNAUTHORIZED',
              });
          }

          if (
            error instanceof Error &&
            error.message ===
              'ROLE_ACCESS_DENIED'
          ) {
            return reply
              .code(403)
              .send({
                error: 'FORBIDDEN',
              });
          }

          if (
            error instanceof
            z.ZodError
          ) {
            return reply
              .code(400)
              .send({
                error:
                  'INVALID_SETTINGS',
                issues:
                  error.issues,
              });
          }

          request.log.error(error);

          return reply
            .code(500)
            .send({
              error:
                'SETTINGS_UPDATE_FAILED',
            });
        }
      },
    );
  };