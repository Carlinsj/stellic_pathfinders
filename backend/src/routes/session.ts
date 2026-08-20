import type { FastifyPluginAsync } from 'fastify';

import { authenticateRequest, AuthenticationError } from '../plugins/auth.js';

export const sessionRoutes: FastifyPluginAsync = async (app) => {
  app.delete('/auth/session', async (request, reply) => {
    try {
      await authenticateRequest(request);

      // Demo JWTs are stateless and remain valid until their short expiry. The
      // client completes logout by discarding its token; no Supabase session exists.
      return reply.code(204).send();
    } catch (error) {
      if (error instanceof AuthenticationError) {
        return reply.code(401).send({ error: 'UNAUTHORIZED', message: error.message });
      }

      request.log.error(error);
      return reply.code(500).send({ error: 'SIGN_OUT_FAILED' });
    }
  });
};
