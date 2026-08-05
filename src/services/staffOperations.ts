import type { DemoState, Facility } from '../domain/types';
import { addMinutes } from '../lib/format';
import { canAccessArea } from './accessControl';

const requireStaffAccess = (state: DemoState): void => {
  if (!canAccessArea(state.currentUser.role, 'staff')) {
    throw new Error('Staff access required');
  }
  if (state.currentUser.universityId !== state.university.id) {
    throw new Error('Cross-tenant staff operation denied');
  }
};

const requireOwnedFacility = (state: DemoState, facilityId: string): Facility => {
  const facility = state.facilities.find((item) => item.id === facilityId && item.universityId === state.university.id);
  if (!facility) throw new Error('Facility not found in tenant');
  return facility;
};

const requireOwnedInventory = (state: DemoState, facilityId: string, equipmentTypeId: string): void => {
  requireOwnedFacility(state, facilityId);
  const inventory = state.facilityEquipment.find((item) =>
    item.universityId === state.university.id &&
    item.facilityId === facilityId &&
    item.equipmentTypeId === equipmentTypeId);
  if (!inventory) throw new Error('Equipment inventory not found in tenant');
};

export const markEquipmentUnavailable = (
  state: DemoState,
  facilityId: string,
  equipmentTypeId: string,
  units = 1,
  reason = 'Staff-reported maintenance'
): DemoState => {
  requireStaffAccess(state);
  requireOwnedInventory(state, facilityId, equipmentTypeId);
  const quantity = Math.max(1, Math.floor(units));
  return {
    ...state,
    facilityEquipment: state.facilityEquipment.map((item) =>
      item.universityId === state.university.id && item.facilityId === facilityId && item.equipmentTypeId === equipmentTypeId
        ? { ...item, operationalQuantity: Math.max(0, item.operationalQuantity - quantity), outageReason: reason }
        : item)
  };
};

export const restoreEquipment = (
  state: DemoState,
  facilityId: string,
  equipmentTypeId: string,
  units: number
): DemoState => {
  requireStaffAccess(state);
  requireOwnedInventory(state, facilityId, equipmentTypeId);
  if (!Number.isInteger(units) || units < 1) {
    throw new Error('Restore quantity must be a positive whole number');
  }
  const inventory = state.facilityEquipment.find((item) =>
    item.universityId === state.university.id &&
    item.facilityId === facilityId &&
    item.equipmentTypeId === equipmentTypeId)!;
  const unavailableQuantity = Math.max(0, inventory.totalQuantity - inventory.operationalQuantity);
  if (units > unavailableQuantity) {
    throw new Error('Cannot restore more units than are out of service');
  }
  return {
    ...state,
    facilityEquipment: state.facilityEquipment.map((item) =>
      item.universityId === state.university.id && item.facilityId === facilityId && item.equipmentTypeId === equipmentTypeId
        ? {
            ...item,
            operationalQuantity: item.operationalQuantity + units,
            outageReason: item.operationalQuantity + units === item.totalQuantity ? undefined : item.outageReason
          }
        : item)
  };
};

export const updateTodayClosingTime = (state: DemoState, facilityId: string, closingTime: string): DemoState => {
  requireStaffAccess(state);
  requireOwnedFacility(state, facilityId);
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(closingTime)) throw new Error('Invalid closing time');
  const weekday = new Date(state.now).getDay();
  return {
    ...state,
    facilities: state.facilities.map((facility) => facility.id === facilityId
      ? { ...facility, hours: facility.hours.map((hours) => hours.weekday === weekday ? { ...hours, closingTime } : hours) }
      : facility)
  };
};

export const closeFacilityTemporarily = (state: DemoState, facilityId: string, minutes = 120): DemoState => {
  requireStaffAccess(state);
  requireOwnedFacility(state, facilityId);
  const duration = Math.max(1, Math.floor(minutes));
  return {
    ...state,
    facilities: state.facilities.map((facility) => facility.id === facilityId
      ? { ...facility, specialClosure: { startsAt: state.now, endsAt: addMinutes(state.now, duration), reason: 'Temporary staff-created demo closure' } }
      : facility)
  };
};

export const reopenFacility = (state: DemoState, facilityId: string): DemoState => {
  requireStaffAccess(state);
  requireOwnedFacility(state, facilityId);
  return {
    ...state,
    facilities: state.facilities.map((facility) => facility.id === facilityId
      ? { ...facility, specialClosure: undefined }
      : facility)
  };
};
