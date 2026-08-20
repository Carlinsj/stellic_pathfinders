import type {
  FastifyPluginAsync,
} from 'fastify';

import { z } from 'zod';

import {
  supabaseAdmin,
} from '../plugins/supabase.js';

import { env } from '../config/env.js';

const bodySchema = z.object({
  at: z
    .string()
    .datetime()
    .optional(),
});

export const internalJobRoutes:
  FastifyPluginAsync =
  async (app) => {
    app.post(
      '/internal/jobs/visit-lifecycle',
      async (request, reply) => {
        const secret =
          request.headers[
            'x-internal-job-secret'
          ];

        if (
          secret !==
          env.INTERNAL_JOB_SECRET
        ) {
          return reply
            .code(401)
            .send({
              error:
                'UNAUTHORIZED',
            });
        }

        try {
          const body =
            bodySchema.parse(
              request.body ?? {},
            );

          const at =
            body.at ??
            new Date()
              .toISOString();

          let remindersCreated = 0;
          let visitsExpired = 0;
          let visitsAutoClosed = 0;

          /*
           * 1. Expected-finish reminders
           */
          const {
            data: reminderVisits,
            error:
              reminderQueryError,
          } =
            await supabaseAdmin
              .from('visits')
              .select(
                `
                id,
                university_id,
                user_id,
                expected_end_at
                `,
              )
              .eq(
                'status',
                'checked_in',
              )
              .lte(
                'expected_end_at',
                at,
              )
              .is(
                'checked_out_at',
                null,
              );

          if (reminderQueryError) {
            throw reminderQueryError;
          }

          for (
            const visit of
            reminderVisits ?? []
          ) {
            const {
              data: existing,
            } =
              await supabaseAdmin
                .from(
                  'notifications',
                )
                .select('id')
                .eq(
                  'visit_id',
                  visit.id,
                )
                .eq(
                  'kind',
                  'expected_finish',
                )
                .limit(1);

            if (
              (existing?.length ??
                0) === 0
            ) {
              const { error } =
                await supabaseAdmin
                  .from(
                    'notifications',
                  )
                  .insert({
                    university_id:
                      visit.university_id,

                    user_id:
                      visit.user_id,

                    visit_id:
                      visit.id,

                    kind:
                      'expected_finish',

                    body:
                      'Your expected workout finish time has passed. Extend your visit or check out.',

                    scheduled_at:
                      at,
                  });

              if (!error) {
                remindersCreated++;
              }
            }
          }

          /*
           * 2. Expire plans whose
           * planned arrival is in
           * the past.
           */
          const {
            data: expired,
            error: expireError,
          } =
            await supabaseAdmin
              .from('visits')
              .update({
                status:
                  'expired',

                updated_at:
                  at,
              })
              .in(
                'status',
                [
                  'planned',
                  'delayed',
                ],
              )
              .lt(
                'planned_arrival_at',
                at,
              )
              .select('id');

          if (expireError) {
            throw expireError;
          }

          visitsExpired =
            expired?.length ?? 0;

          /*
           * 3. Auto-close active
           * visits whose auto_close_at
           * has passed.
           */
          const {
            data: autoClosed,
            error:
              autoCloseError,
          } =
            await supabaseAdmin
              .from('visits')
              .update({
                status:
                  'auto_closed',

                checked_out_at:
                  at,

                updated_at:
                  at,
              })
              .eq(
                'status',
                'checked_in',
              )
              .lt(
                'auto_close_at',
                at,
              )
              .select(
                `
                id,
                university_id,
                user_id
                `,
              );

          if (autoCloseError) {
            throw autoCloseError;
          }

          visitsAutoClosed =
            autoClosed?.length ??
            0;

          /*
           * Create automatic-checkout
           * notifications.
           */
          if (
            autoClosed &&
            autoClosed.length > 0
          ) {
            await supabaseAdmin
              .from('notifications')
              .insert(
                autoClosed.map(
                  (visit) => ({
                    university_id:
                      visit.university_id,

                    user_id:
                      visit.user_id,

                    visit_id:
                      visit.id,

                    kind:
                      'auto_checkout',

                    body:
                      'CampusFit automatically closed your visit after the configured grace period.',

                    sent_at:
                      at,
                  }),
                ),
              );
          }

          return {
            remindersCreated,
            visitsExpired,
            visitsAutoClosed,
          };
        } catch (error) {
          request.log.error(error);

          return reply
            .code(500)
            .send({
              error:
                'VISIT_LIFECYCLE_JOB_FAILED',
            });
        }
      },
    );
  };