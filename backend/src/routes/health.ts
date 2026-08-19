import type { FastifyPluginAsync } from 'fastify';
import { supabaseAdmin } from '../plugins/supabase.js';

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/health', async (_request, reply) => {
    const { error } = await supabaseAdmin
      .from('universities')
      .select('id')
      .limit(1);

    if (error) {
      return reply.code(503).send({
        status: 'unavailable',
        database: 'unavailable',
      });
    }

    return {
      status: 'ok',
      database: 'ok',
    };
  });
};