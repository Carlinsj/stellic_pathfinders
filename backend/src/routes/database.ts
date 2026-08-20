import type { FastifyPluginAsync } from 'fastify';
import { supabase } from '../plugins/supabase.js';

export const databaseRoutes: FastifyPluginAsync = async (app) => {
  app.get('/database', async (_request, reply) => {
    const { data, error } = await supabase
      .from('facilities')
      .select('*')
      .limit(1);

    if (error) {
      app.log.error(error);

      return reply.status(500).send({
        status: 'error',
        message: error.message,
      });
    }

    return {
      status: 'ok',
      connected: true,
      data,
    };
  });
};