import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import {
  authenticateRequest,
  AuthenticationError,
} from '../plugins/auth.js';

import { createUserSupabase } from '../plugins/supabase.js';
import { requireTenantAccess } from '../services/tenantAccess.js';

const tenantParamsSchema = z.object({
  tenant: z.string().min(1),
});

const notificationParamsSchema = z.object({
  tenant: z.string().min(1),
  notificationId: z.string().uuid(),
});

const updateNotificationSchema = z.object({
  action: z.enum(['read', 'dismiss']),
});

export const notificationRoutes: FastifyPluginAsync =
  async (app) => {
    /*
     * 11. GET /me/notifications
     */
    app.get(
      '/tenants/:tenant/me/notifications',
      async (request, reply) => {
        try {
          const { tenant } =
            tenantParamsSchema.parse(
              request.params,
            );

          const { token, user } =
            await authenticateRequest(request);

          const db =
            createUserSupabase(token);

          const { university } =
            await requireTenantAccess(
              db,
              user.id,
              tenant,
            );

          const {
            data: notifications,
            error,
          } = await db
            .from('notifications')
            .select(`
              id,
              university_id,
              user_id,
              visit_id,
              kind,
              body,
              scheduled_at,
              sent_at,
              read_at,
              created_at
            `)
            .eq(
              'university_id',
              university.id,
            )
            .eq('user_id', user.id)
            .order('created_at', {
              ascending: false,
            });

          if (error) {
            throw error;
          }

          return {
            notifications:
              notifications ?? [],
          };
        } catch (error) {
          if (
            error instanceof
            AuthenticationError
          ) {
            return reply.code(401).send({
              error: 'UNAUTHORIZED',
              message: error.message,
            });
          }

          request.log.error(error);

          return reply.code(500).send({
            error:
              'NOTIFICATIONS_FAILED',
            message:
              'Could not load notifications',
          });
        }
      },
    );

    /*
     * 12. PATCH /me/notifications/:notificationId
     */
    app.patch(
      '/tenants/:tenant/me/notifications/:notificationId',
      async (request, reply) => {
        try {
          const {
            tenant,
            notificationId,
          } =
            notificationParamsSchema.parse(
              request.params,
            );

          const body =
            updateNotificationSchema.parse(
              request.body,
            );

          const { token, user } =
            await authenticateRequest(request);

          const db =
            createUserSupabase(token);

          const { university } =
            await requireTenantAccess(
              db,
              user.id,
              tenant,
            );

          const { data: notification } =
            await db
              .from('notifications')
              .select('*')
              .eq('id', notificationId)
              .eq(
                'university_id',
                university.id,
              )
              .eq('user_id', user.id)
              .single();

          if (!notification) {
            return reply
              .code(404)
              .send({
                error:
                  'NOTIFICATION_NOT_FOUND',
              });
          }

          /*
           * Your existing schema does not have
           * dismissed_at, so for now dismissal
           * is represented as read.
           *
           * If you want to distinguish the two,
           * add dismissed_at later.
           */
          const now =
            new Date().toISOString();

          const { data, error } =
            await db
              .from('notifications')
              .update({
                read_at: now,
              })
              .eq('id', notificationId)
              .eq('user_id', user.id)
              .select('*')
              .single();

          if (error) {
            throw error;
          }

          return {
            notification: data,
            action: body.action,
          };
        } catch (error) {
          if (
            error instanceof
            AuthenticationError
          ) {
            return reply.code(401).send({
              error: 'UNAUTHORIZED',
              message: error.message,
            });
          }

          if (
            error instanceof z.ZodError
          ) {
            return reply.code(400).send({
              error:
                'INVALID_NOTIFICATION_UPDATE',
              issues: error.issues,
            });
          }

          request.log.error(error);

          return reply.code(500).send({
            error:
              'NOTIFICATION_UPDATE_FAILED',
          });
        }
      },
    );
  };