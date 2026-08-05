import { AlertTriangle, ArrowRight, Check, CheckCircle2, Clock3, Construction, DoorClosed, Minus, Plus, Power, RotateCcw, Save, ShieldCheck, Wrench } from 'lucide-react';
import { useState } from 'react';
import { Button, DataLabel, StatusPill } from '../components/ui';
import { useCampusFit } from '../data/CampusFitContext';
import { useTenant } from '../data/TenantContext';
import { forecastDemand, isSpecialClosureActive } from '../services/forecasting';
import { closeFacilityTemporarily, markEquipmentUnavailable, reopenFacility, restoreEquipment, updateTodayClosingTime } from '../services/staffOperations';

export function StaffPage() {
  const { tenant, state } = useTenant();
  const { updateTenant } = useCampusFit();
  const [facilityId, setFacilityId] = useState(state.facilities[0]!.id);
  const [equipmentId, setEquipmentId] = useState('cable');
  const [restoreUnits, setRestoreUnits] = useState(1);
  const [closingTime, setClosingTime] = useState('23:30');

  const facilityEquipmentTypes = state.equipmentTypes.filter((type) => state.facilityEquipment.some((item) =>
    item.universityId === state.university.id &&
    item.facilityId === facilityId &&
    item.equipmentTypeId === type.id &&
    item.totalQuantity > 0));
  const inventory = state.facilityEquipment.find((item) =>
    item.universityId === state.university.id &&
    item.facilityId === facilityId &&
    item.equipmentTypeId === equipmentId);
  const equipment = state.equipmentTypes.find((item) => item.id === equipmentId);
  const facility = state.facilities.find((item) => item.id === facilityId)!;
  const forecast = forecastDemand(state, facilityId);
  const unavailableQuantity = inventory ? Math.max(0, inventory.totalQuantity - inventory.operationalQuantity) : 0;
  const operationalPercentage = inventory?.totalQuantity
    ? Math.round(inventory.operationalQuantity / inventory.totalQuantity * 100)
    : 0;
  const outageActive = unavailableQuantity > 0;
  const restoreQuantity = Math.min(Math.max(1, restoreUnits), Math.max(1, unavailableQuantity));
  const restoreOptions = [...new Set([1, 3, unavailableQuantity])].filter((quantity) =>
    quantity > 0 && quantity <= unavailableQuantity);
  const closureActive = isSpecialClosureActive(facility, state.now);
  const activeClosureCount = state.facilities.filter((item) => isSpecialClosureActive(item, state.now)).length;

  const handleFacilityChange = (nextFacilityId: string) => {
    setFacilityId(nextFacilityId);
    const firstEquipment = state.equipmentTypes.find((type) => state.facilityEquipment.some((item) =>
      item.universityId === state.university.id &&
      item.facilityId === nextFacilityId &&
      item.equipmentTypeId === type.id &&
      item.totalQuantity > 0));
    setEquipmentId(firstEquipment?.id ?? 'cable');
    setRestoreUnits(1);
  };

  const selectRestoreQuantity = (quantity: number) => {
    const wholeQuantity = Number.isFinite(quantity) ? Math.trunc(quantity) : 1;
    setRestoreUnits(Math.min(unavailableQuantity, Math.max(1, wholeQuantity)));
  };

  const markUnavailable = () => updateTenant(
    tenant,
    (current) => markEquipmentUnavailable(current, facilityId, equipmentId),
    `${equipment?.displayName ?? 'Equipment'} supply reduced — student forecasts recalculated`
  );
  const restore = () => {
    const remainingQuantity = unavailableQuantity - restoreQuantity;
    updateTenant(
      tenant,
      (current) => restoreEquipment(current, facilityId, equipmentId, restoreQuantity),
      `${restoreQuantity} ${equipment?.displayName ?? 'equipment'} ${restoreQuantity === 1 ? 'unit' : 'units'} restored — ${remainingQuantity === 0 ? 'all units are back up and running' : `${remainingQuantity} still out of service`}`
    );
    setRestoreUnits(1);
  };
  const saveHours = () => updateTenant(
    tenant,
    (current) => updateTodayClosingTime(current, facilityId, closingTime),
    'Operating hours saved'
  );
  const createClosure = () => updateTenant(
    tenant,
    (current) => closeFacilityTemporarily(current, facilityId),
    `Temporary closure published for ${facility.shortName}`
  );
  const reopen = () => updateTenant(
    tenant,
    (current) => reopenFacility(current, facilityId),
    `${facility.shortName} is open and operating again`
  );

  return <div className="page-stack staff-page">
    <header className="page-header">
      <div><DataLabel>Recreation staff workspace</DataLabel><h1>Keep campus demand trustworthy.</h1><p>Update hours, closures, equipment supply, and activity availability.</p></div>
      <span className="role-chip"><ShieldCheck />Authorized staff portal</span>
    </header>

    <section className="staff-overview">
      <article><span><Clock3 /></span><strong>{state.facilities.length}</strong><p>Facilities reporting</p><small>All synthetic feeds current</small></article>
      <article><span><Wrench /></span><strong>{state.facilityEquipment.filter((item) => item.universityId === state.university.id && item.operationalQuantity < item.totalQuantity).length}</strong><p>Equipment outages</p><small>Included in demand models</small></article>
      <article><span><AlertTriangle /></span><strong>{activeClosureCount}</strong><p>Temporary closures</p><small>Recommendations exclude closures</small></article>
      <article><span><Check /></span><strong>92%</strong><p>Report quality</p><small>Synthetic confidence score</small></article>
    </section>

    <section className="admin-grid">
      <article className="admin-card admin-card--wide equipment-admin-card">
        <div className="equipment-card-heading"><div><DataLabel>Equipment inventory</DataLabel><h2>Equipment availability</h2><p>Choose a resource, review its live status, then record a completed repair or outage.</p></div><span><Wrench /></span></div>

        <div className="equipment-selector-grid">
          <label>Facility<select value={facilityId} onChange={(event) => handleFacilityChange(event.target.value)}>{state.facilities.map((item) => <option key={item.id} value={item.id}>{item.shortName}</option>)}</select></label>
          <label>Equipment type<select value={equipmentId} onChange={(event) => { setEquipmentId(event.target.value); setRestoreUnits(1); }}>{facilityEquipmentTypes.map((item) => <option key={item.id} value={item.id}>{item.displayName}</option>)}</select></label>
        </div>

        <section className={`equipment-control-panel ${outageActive ? 'equipment-control-panel--reduced' : ''}`} aria-labelledby="equipment-status-title">
          <div className="equipment-control-topline">
            <div className="equipment-resource-title">
              <span><Wrench /></span>
              <div><DataLabel>Selected resource</DataLabel><h3 id="equipment-status-title">{equipment?.displayName ?? 'Equipment'}</h3></div>
            </div>
            <div className="equipment-status-summary" aria-live="polite">
              <StatusPill level={outageActive ? 'high' : 'low'}>{outageActive ? 'Service reduced' : 'Fully operational'}</StatusPill>
              <strong>{inventory?.operationalQuantity ?? 0}<span> / {inventory?.totalQuantity ?? 0}</span></strong>
              <small>operational</small>
            </div>
          </div>

          <div className="equipment-availability-line">
            <div className="inventory-meter" role="progressbar" aria-label={`${equipment?.displayName ?? 'Equipment'} operational availability`} aria-valuemin={0} aria-valuemax={inventory?.totalQuantity ?? 0} aria-valuenow={inventory?.operationalQuantity ?? 0}><span style={{ width: `${operationalPercentage}%` }} /></div>
            <p><strong>{inventory?.operationalQuantity ?? 0} ready</strong><span>{outageActive ? `${unavailableQuantity} out of service` : 'No active outage'}</span></p>
          </div>

          {outageActive ? <div className="repair-toolbar" aria-labelledby="repair-flow-title">
            <div className="repair-toolbar-copy"><span><RotateCcw /></span><div><h3 id="repair-flow-title">Record completed repair</h3><p>Select only units that passed maintenance.</p></div></div>

            <div className="repair-inline-controls">
              <div className="repair-quantity-field">
                <label htmlFor="restore-quantity">Units repaired</label>
                <div className="repair-quantity-control">
                  <button type="button" aria-label="Decrease restored units" disabled={restoreQuantity <= 1} onClick={() => selectRestoreQuantity(restoreQuantity - 1)}><Minus /></button>
                  <div className="repair-quantity-value"><input id="restore-quantity" type="number" inputMode="numeric" min={1} max={unavailableQuantity} value={restoreQuantity} onChange={(event) => selectRestoreQuantity(Number(event.target.value))} /><span>{restoreQuantity === 1 ? 'unit' : 'units'}</span></div>
                  <button type="button" aria-label="Increase restored units" disabled={restoreQuantity >= unavailableQuantity} onClick={() => selectRestoreQuantity(restoreQuantity + 1)}><Plus /></button>
                </div>
              </div>

              <div className="repair-quick-row" role="group" aria-label="Quick restoration quantities">{restoreOptions.map((quantity) => <button type="button" key={quantity} className={restoreQuantity === quantity ? 'is-selected' : ''} aria-pressed={restoreQuantity === quantity} onClick={() => selectRestoreQuantity(quantity)}>{quantity === unavailableQuantity ? `All ${quantity}` : quantity}</button>)}</div>

              <div className="repair-outcome" aria-live="polite"><span>{inventory!.operationalQuantity} / {inventory!.totalQuantity}</span><ArrowRight /><strong>{inventory!.operationalQuantity + restoreQuantity} / {inventory!.totalQuantity}</strong><small>after repair</small></div>

              <Button className="repair-confirm-button" onClick={restore}><CheckCircle2 />Restore {restoreQuantity} {restoreQuantity === 1 ? 'unit' : 'units'}</Button>
            </div>
            <small className="repair-limit-note">Up to {unavailableQuantity} {unavailableQuantity === 1 ? 'unit is' : 'units are'} eligible to restore. Higher values are blocked.</small>
          </div> : <div className="repair-all-clear"><CheckCircle2 /><div><strong>Everything is ready</strong><small>All {inventory?.totalQuantity ?? 0} units are operational. There are no repairs to record.</small></div></div>}

          <div className="outage-action"><div><strong>Report an equipment issue</strong><small>Remove one unit from student availability.</small></div><Button variant="ghost" onClick={markUnavailable} disabled={!inventory || inventory.operationalQuantity === 0}><Construction />Mark 1 out of service</Button></div>
        </section>
      </article>

      <article className="admin-card">
        <div className="card-heading"><div><DataLabel>Operating status</DataLabel><h2>Hours and closures</h2></div><DoorClosed /></div>
        <div className="form-stack"><label>Today’s closing time<input type="time" value={closingTime} onChange={(event) => setClosingTime(event.target.value)} /></label><Button variant="secondary" onClick={saveHours}><Save />Save hours</Button><div className={`operating-state ${closureActive ? 'operating-state--closed' : ''}`} aria-live="polite">{closureActive ? <DoorClosed /> : <CheckCircle2 />}<div><strong>{closureActive ? 'Temporarily closed' : 'Open and operating'}</strong><small>{closureActive ? facility.specialClosure?.reason : 'No active staff closure'}</small></div></div><p className="muted-copy">Emergency or maintenance closures immediately remove this facility from recommendations.</p>{closureActive ? <Button variant="secondary" onClick={reopen}><Power />Reopen {facility.shortName} now</Button> : <Button variant="danger" onClick={createClosure}><DoorClosed />Close {facility.shortName} for 2 hours</Button>}</div>
      </article>

      <article className="admin-card"><div className="card-heading"><div><DataLabel>Anonymous forecast review</DataLabel><h2>{facility.shortName} right now</h2></div><StatusPill level={forecast.crowdLevel} /></div><div className="forecast-review"><div><strong>{forecast.expectedRange[0]}–{forecast.expectedRange[1]}</strong><span>predicted visitor range</span></div><div><strong>{forecast.plannedCount}</strong><span>declared plans in interval</span></div><div><strong>{forecast.confidence}</strong><span>forecast confidence</span></div></div><p className="source-copy">{forecast.sourceExplanation}</p></article>
    </section>
  </div>;
}
