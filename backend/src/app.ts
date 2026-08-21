import Fastify from 'fastify';
import jwt from '@fastify/jwt';

import { env } from './config/env.js';

import { healthRoutes } from './routes/health.js';
import { demoAuthRoutes } from './routes/demoAuth.js';
import { sessionRoutes } from './routes/session.js';
import { bootstrapRoutes } from './routes/bootstrap.js';
import { facilityRoutes } from './routes/facilities.js';
import { participationRoutes } from './routes/participation.js';
import { recommendationRoutes } from './routes/recommendations.js';
import { visitRoutes } from './routes/visits.js';
import { notificationRoutes } from './routes/notifications.js';
import { staffFacilityRoutes } from './routes/staffFacilities.js';
import { adminRoutes } from './routes/admin.js';
import { internalJobRoutes } from './routes/internalJobs.js';
import { demoRoutes } from './routes/demo.js';

export function buildApp() {
  const app = Fastify({
    logger: true,
  });

  app.register(jwt, {
    secret: env.DEMO_JWT_SECRET,
  });

  app.register(healthRoutes, {
    prefix: '/api/v1',
  });

  app.register(demoAuthRoutes, {
    prefix: '/api/v1',
  });

  app.register(sessionRoutes, {
    prefix: '/api/v1',
  });

  app.register(bootstrapRoutes, {
    prefix: '/api/v1',
  });

  app.register(facilityRoutes, {
    prefix: '/api/v1',
  });

  app.register(participationRoutes, {
    prefix: '/api/v1',
  });

  app.register(recommendationRoutes, {
    prefix: '/api/v1',
  });

  app.register(visitRoutes, {
    prefix: '/api/v1',
  });

  app.register(notificationRoutes, {
    prefix: '/api/v1',
  });

  app.register(staffFacilityRoutes, {
    prefix: '/api/v1',
  });

  app.register(adminRoutes, {
    prefix: '/api/v1',
  });

  app.register(demoRoutes, {
    prefix: '/api/v1',
  });

  app.register(internalJobRoutes, {
    prefix: '/api/v1',
  });

  return app;
}
