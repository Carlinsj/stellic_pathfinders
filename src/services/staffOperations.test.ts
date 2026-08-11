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
    expect(() => restoreEquipment(state, 'nyu_palladium', 'cable', 1)).toThrow('Staff access required');
  });

  it('marks equipment unavailable and restores only the selected number of units', () => {
    const state = staffState();
    const before = state.facilityEquipment.find((item) => item.facilityId === 'nyu_palladium' && item.equipmentTypeId === 'cable')!;
    const reduced = markEquipmentUnavailable(state, 'nyu_palladium', 'cable');
    const unavailable = reduced.facilityEquipment.find((item) => item.facilityId === 'nyu_palladium' && item.equipmentTypeId === 'cable')!;
    expect(unavailable.operationalQuantity).toBe(before.operationalQuantity - 1);
    expect(unavailable.outageReason).toBeTruthy();

    const partiallyRestored = restoreEquipment(reduced, 'nyu_palladium', 'cable', 1);
    const remainingOutage = partiallyRestored.facilityEquipment.find((item) => item.facilityId === 'nyu_palladium' && item.equipmentTypeId === 'cable')!;
    expect(remainingOutage.operationalQuantity).toBe(before.operationalQuantity);
    expect(remainingOutage.operationalQuantity).toBeLessThan(remainingOutage.totalQuantity);
    expect(remainingOutage.outageReason).toBeTruthy();

    const fullyRestored = restoreEquipment(partiallyRestored, 'nyu_palladium', 'cable', 2);
    const available = fullyRestored.facilityEquipment.find((item) => item.facilityId === 'nyu_palladium' && item.equipmentTypeId === 'cable')!;
    expect(available.operationalQuantity).toBe(available.totalQuantity);
    expect(available.outageReason).toBeUndefined();
  });

  it('marks only the selected number of operational units unavailable', () => {
    const state = staffState();
    const before = state.facilityEquipment.find((item) => item.facilityId === 'nyu_palladium' && item.equipmentTypeId === 'cable')!;
    const reduced = markEquipmentUnavailable(state, 'nyu_palladium', 'cable', 3);
    const after = reduced.facilityEquipment.find((item) => item.facilityId === 'nyu_palladium' && item.equipmentTypeId === 'cable')!;
    expect(after.operationalQuantity).toBe(before.operationalQuantity - 3);
    expect(() => markEquipmentUnavailable(state, 'nyu_palladium', 'cable', before.operationalQuantity + 1))
      .toThrow('Cannot mark more units unavailable than are operational');
    expect(() => markEquipmentUnavailable(state, 'nyu_palladium', 'cable', 0))
      .toThrow('Outage quantity must be a positive whole number');
  });

  it('rejects restoring more units than are out of service', () => {
    const state = staffState();
    expect(() => restoreEquipment(state, 'nyu_palladium', 'cable', 3))
      .toThrow('Cannot restore more units than are out of service');
    expect(() => restoreEquipment(state, 'nyu_palladium', 'cable', 0))
      .toThrow('Restore quantity must be a positive whole number');
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
    expect(() => restoreEquipment(staffState(), 'foreign_facility', 'cable', 1)).toThrow('Facility not found in tenant');
  });
});
