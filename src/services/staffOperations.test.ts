import { describe, expect, it } from 'vitest';
import { createDemoState, demoAccounts } from '../data/seed';
import { isFacilityOpen } from './forecasting';
import { closeFacilityTemporarily, markEquipmentUnavailable, reopenFacility, restoreEquipment } from './staffOperations';

const staffState = () => ({
  ...createDemoState('nyu'),
  currentUser: demoAccounts.nyu.find((account) => account.role === 'recreation_staff')!
});

describe('staff operations', () => {
  it('denies equipment mutations to students', () => {
    const state = createDemoState('nyu');
    expect(() => restoreEquipment(state, 'nyu_palladium', 'cable')).toThrow('Staff access required');
  });

  it('marks equipment unavailable and restores every unit', () => {
    const state = staffState();
    const before = state.facilityEquipment.find((item) => item.facilityId === 'nyu_palladium' && item.equipmentTypeId === 'cable')!;
    const reduced = markEquipmentUnavailable(state, 'nyu_palladium', 'cable');
    const unavailable = reduced.facilityEquipment.find((item) => item.facilityId === 'nyu_palladium' && item.equipmentTypeId === 'cable')!;
    expect(unavailable.operationalQuantity).toBe(before.operationalQuantity - 1);
    expect(unavailable.outageReason).toBeTruthy();

    const restored = restoreEquipment(reduced, 'nyu_palladium', 'cable');
    const available = restored.facilityEquipment.find((item) => item.facilityId === 'nyu_palladium' && item.equipmentTypeId === 'cable')!;
    expect(available.operationalQuantity).toBe(available.totalQuantity);
    expect(available.outageReason).toBeUndefined();
  });

  it('closes and explicitly reopens an owned facility', () => {
    const state = staffState();
    const closed = closeFacilityTemporarily(state, 'nyu_palladium');
    expect(isFacilityOpen(closed.facilities[0]!, state.now)).toBe(false);
    const reopened = reopenFacility(closed, 'nyu_palladium');
    expect(reopened.facilities[0]!.specialClosure).toBeUndefined();
    expect(isFacilityOpen(reopened.facilities[0]!, state.now)).toBe(true);
  });

  it('rejects cross-tenant facility identifiers', () => {
    expect(() => restoreEquipment(staffState(), 'foreign_facility', 'cable')).toThrow('Facility not found in tenant');
  });
});
