import type { FastifyPluginAsync } from 'fastify';
import {
  closureSchema, equipmentParamsSchema, equipmentUpdateSchema, facilityParamsSchema,
  findTenantFacility, getFacilityForecasts, getWeekday, hoursUpdateSchema,
  requireStaffContext, sendStaffRouteError, tenantParamsSchema,
} from './staffFacilityHelpers.js';

export const staffFacilityRoutes: FastifyPluginAsync = async (app) => {
  app.get('/tenants/:tenant/staff/facilities', async (request, reply) => {
    try {
      const { tenant } = tenantParamsSchema.parse(request.params);
      const { db, university } = await requireStaffContext(request, tenant);
      const { data, error } = await db.from('facilities').select(`
        *, facility_operating_hours(*),
        facility_equipment(*, equipment_types(id, key, display_name, category), equipment_outages(*)),
        demand_forecasts(*)
      `).eq('university_id', university.id).eq('active', true).order('name');
      if (error) throw error;
      return { facilities: data ?? [] };
    } catch (error) {
      return sendStaffRouteError(request, reply, error, 'STAFF_FACILITIES_FAILED');
    }
  });

  app.get('/tenants/:tenant/staff/facilities/:facilityId', async (request, reply) => {
    try {
      const { tenant, facilityId } = facilityParamsSchema.parse(request.params);
      const { db, university } = await requireStaffContext(request, tenant);
      const { data: facility, error } = await db.from('facilities').select(`
        *, facility_operating_hours(*), facility_activities(*, activities(*)),
        facility_equipment(*, equipment_types(*)), demand_forecasts(*), occupancy_observations(*)
      `).eq('id', facilityId).eq('university_id', university.id).single();
      if (error || !facility) return reply.code(404).send({ error: 'FACILITY_NOT_FOUND' });

      const equipmentIds = facility.facility_equipment?.map((item: { id: string }) => item.id) ?? [];
      let outages: unknown[] = [];
      if (equipmentIds.length > 0) {
        const result = await db.from('equipment_outages').select('*')
          .eq('university_id', university.id).in('facility_equipment_id', equipmentIds)
          .is('resolved_at', null);
        if (result.error) throw result.error;
        outages = result.data ?? [];
      }
      return { facility: { ...facility, equipmentOutages: outages } };
    } catch (error) {
      return sendStaffRouteError(request, reply, error, 'STAFF_FACILITY_FAILED');
    }
  });

  app.patch('/tenants/:tenant/staff/facilities/:facilityId/equipment/:equipmentTypeId', async (request, reply) => {
    try {
      const { tenant, facilityId, equipmentTypeId } = equipmentParamsSchema.parse(request.params);
      const body = equipmentUpdateSchema.parse(request.body);
      const { db, university } = await requireStaffContext(request, tenant);
      const { data: inventory, error } = await db.from('facility_equipment').select('*')
        .eq('university_id', university.id).eq('facility_id', facilityId)
        .eq('equipment_type_id', equipmentTypeId).single();
      if (error || !inventory) return reply.code(404).send({ error: 'EQUIPMENT_NOT_FOUND' });

      const unavailable = inventory.total_quantity - inventory.operational_quantity;
      if (body.action === 'mark_unavailable' && body.units > inventory.operational_quantity) {
        return reply.code(409).send({ error: 'INSUFFICIENT_OPERATIONAL_UNITS' });
      }
      if (body.action === 'restore' && body.units > unavailable) {
        return reply.code(409).send({ error: 'RESTORE_EXCEEDS_OUTAGE_COUNT' });
      }

      const change = body.action === 'mark_unavailable' ? -body.units : body.units;
      const { data: updated, error: updateError } = await db.from('facility_equipment').update({
        operational_quantity: inventory.operational_quantity + change,
        last_verified_at: new Date().toISOString(), verification_source: 'staff',
      }).eq('id', inventory.id).eq('operational_quantity', inventory.operational_quantity)
        .select('*').single();
      // Comparing the old quantity prevents concurrent requests from overwriting a newer value.
      if (updateError || !updated) return reply.code(409).send({
        error: 'CONCURRENT_EQUIPMENT_UPDATE',
        message: 'Equipment quantity changed while this request was being processed. Retry.',
      });

      const now = new Date().toISOString();
      if (body.action === 'mark_unavailable') {
        const result = await db.from('equipment_outages').insert({
          university_id: university.id, facility_equipment_id: inventory.id,
          started_at: now, reason: body.reason!, status: 'active',
        });
        if (result.error) request.log.error(result.error);
      } else {
        await db.from('equipment_outages').update({ resolved_at: now, status: 'resolved' })
          .eq('facility_equipment_id', inventory.id).is('resolved_at', null);
      }

      const { data: forecasts } = await db.from('equipment_demand_forecasts').select('*')
        .eq('university_id', university.id).eq('facility_id', facilityId)
        .eq('equipment_type_id', equipmentTypeId);
      return { inventory: updated, affectedForecasts: forecasts ?? [] };
    } catch (error) {
      return sendStaffRouteError(request, reply, error, 'EQUIPMENT_UPDATE_FAILED', 'INVALID_EQUIPMENT_UPDATE');
    }
  });

  app.patch('/tenants/:tenant/staff/facilities/:facilityId/hours', async (request, reply) => {
    try {
      const { tenant, facilityId } = facilityParamsSchema.parse(request.params);
      const body = hoursUpdateSchema.parse(request.body);
      const { db, university } = await requireStaffContext(request, tenant);
      const facility = await findTenantFacility(db, university.id, facilityId);
      if (!facility) return reply.code(404).send({ error: 'FACILITY_NOT_FOUND' });
      const { data: hours, error } = await db.from('facility_operating_hours')
        .update({ closing_time: body.closingTime }).eq('university_id', university.id)
        .eq('facility_id', facilityId).eq('weekday', getWeekday(university.timezone))
        .select('*').single();
      if (error || !hours) throw error ?? new Error('Operating hours were not updated');
      return {
        facility: { ...facility, todayHours: hours },
        affectedForecasts: await getFacilityForecasts(db, university.id, facilityId),
      };
    } catch (error) {
      return sendStaffRouteError(request, reply, error, 'HOURS_UPDATE_FAILED', 'INVALID_HOURS_UPDATE');
    }
  });

  app.put('/tenants/:tenant/staff/facilities/:facilityId/closure', async (request, reply) => {
    try {
      const { tenant, facilityId } = facilityParamsSchema.parse(request.params);
      const body = closureSchema.parse(request.body ?? {});
      const { db, university, user } = await requireStaffContext(request, tenant);
      const facility = await findTenantFacility(db, university.id, facilityId);
      if (!facility) return reply.code(404).send({ error: 'FACILITY_NOT_FOUND' });

      const startsAt = new Date();
      const endsAt = new Date(startsAt.getTime() + body.durationMinutes * 60_000);
      await db.from('facility_closures').delete().eq('university_id', university.id)
        .eq('facility_id', facilityId).lte('starts_at', startsAt.toISOString())
        .gt('ends_at', startsAt.toISOString());
      const { data: closure, error } = await db.from('facility_closures').insert({
        university_id: university.id, facility_id: facilityId, reason: body.reason,
        starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString(), created_by: user.id,
      }).select('*').single();
      if (error || !closure) throw error ?? new Error('Facility closure was not created');
      return {
        facility: { ...facility, closure },
        affectedForecasts: await getFacilityForecasts(db, university.id, facilityId),
      };
    } catch (error) {
      return sendStaffRouteError(request, reply, error, 'FACILITY_CLOSURE_FAILED', 'INVALID_CLOSURE');
    }
  });

  app.delete('/tenants/:tenant/staff/facilities/:facilityId/closure', async (request, reply) => {
    try {
      const { tenant, facilityId } = facilityParamsSchema.parse(request.params);
      const { db, university } = await requireStaffContext(request, tenant);
      const facility = await findTenantFacility(db, university.id, facilityId);
      if (!facility) return reply.code(404).send({ error: 'FACILITY_NOT_FOUND' });
      const now = new Date().toISOString();
      const { error } = await db.from('facility_closures').delete()
        .eq('university_id', university.id).eq('facility_id', facilityId)
        .lte('starts_at', now).gt('ends_at', now);
      if (error) throw error;
      return {
        facility: { ...facility, closure: null },
        affectedForecasts: await getFacilityForecasts(db, university.id, facilityId),
      };
    } catch (error) {
      return sendStaffRouteError(request, reply, error, 'FACILITY_REOPEN_FAILED');
    }
  });
};
