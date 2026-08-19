import type { FastifyReply, FastifyRequest } from 'fastify';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

import { authenticateRequest, AuthenticationError } from '../plugins/auth.js';
import { createUserSupabase } from '../plugins/supabase.js';
import { requireRole } from '../services/authorization.js';
import { requireTenantAccess } from '../services/tenantAccess.js';

const staffRoles = ['recreation_staff', 'university_admin', 'platform_admin'] as const;

export const tenantParamsSchema = z.object({ tenant: z.string().min(1) });
export const facilityParamsSchema = tenantParamsSchema.extend({ facilityId: z.string().uuid() });
export const equipmentParamsSchema = facilityParamsSchema.extend({ equipmentTypeId: z.string().uuid() });

export const hoursUpdateSchema = z.object({
  closingTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'closingTime must use HH:mm format'),
});

export const closureSchema = z.object({
  durationMinutes: z.number().int().min(1).default(120),
  reason: z.string().min(1).default('Staff-reported temporary closure'),
});

export const equipmentUpdateSchema = z.object({
  action: z.enum(['mark_unavailable', 'restore']),
  units: z.number().int().min(1),
  reason: z.string().min(1).optional(),
}).superRefine((body, context) => {
  if (body.action === 'mark_unavailable' && !body.reason) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'reason is required when marking equipment unavailable',
    });
  }
});

export async function requireStaffContext(request: FastifyRequest, tenant: string) {
  const { token, user } = await authenticateRequest(request);
  const db = createUserSupabase(token);
  const { university, profile } = await requireTenantAccess(db, user.id, tenant);
  requireRole(profile.role, [...staffRoles]);
  return { db, university, user };
}

export async function findTenantFacility(db: SupabaseClient, universityId: string, facilityId: string) {
  const { data } = await db.from('facilities').select('*')
    .eq('id', facilityId).eq('university_id', universityId).single();
  return data;
}

export async function getFacilityForecasts(db: SupabaseClient, universityId: string, facilityId: string) {
  const { data } = await db.from('demand_forecasts').select('*')
    .eq('university_id', universityId).eq('facility_id', facilityId);
  return data ?? [];
}

export function getWeekday(timeZone: string, date = new Date()): number {
  const name = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone }).format(date);
  const weekdays: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const weekday = weekdays[name];
  if (weekday === undefined) throw new Error('Could not determine weekday');
  return weekday;
}

export function sendStaffRouteError(
  request: FastifyRequest,
  reply: FastifyReply,
  error: unknown,
  fallbackCode: string,
  validationCode?: string,
) {
  if (error instanceof AuthenticationError) return reply.code(401).send({ error: 'UNAUTHORIZED' });
  if (error instanceof Error && error.message === 'ROLE_ACCESS_DENIED') {
    return reply.code(403).send({ error: 'FORBIDDEN' });
  }
  if (validationCode && error instanceof z.ZodError) {
    return reply.code(400).send({ error: validationCode, issues: error.issues });
  }
  request.log.error(error);
  return reply.code(500).send({ error: fallbackCode });
}
