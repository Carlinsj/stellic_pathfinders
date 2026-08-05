import { AlertTriangle, Check, CheckCircle2, Clock3, Construction, DoorClosed, Power, RotateCcw, Save, ShieldCheck, Wrench } from 'lucide-react';
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
  const [closingTime, setClosingTime] = useState('23:30');
  const inventory = state.facilityEquipment.find((item) => item.universityId === state.university.id && item.facilityId === facilityId && item.equipmentTypeId === equipmentId);
  const equipment = state.equipmentTypes.find((item) => item.id === equipmentId);
  const facility = state.facilities.find((item) => item.id === facilityId)!;
  const forecast = forecastDemand(state, facilityId);
  const outageActive = Boolean(inventory && inventory.operationalQuantity < inventory.totalQuantity);
  const closureActive = isSpecialClosureActive(facility, state.now);
  const activeClosureCount = state.facilities.filter((item) => isSpecialClosureActive(item, state.now)).length;

  const markUnavailable = () => updateTenant(tenant, (current) => markEquipmentUnavailable(current, facilityId, equipmentId), `${equipment?.displayName ?? 'Equipment'} supply reduced — student forecasts recalculated`);
  const restore = () => updateTenant(tenant, (current) => restoreEquipment(current, facilityId, equipmentId), `${equipment?.displayName ?? 'Equipment'} restored — all units are back up and running`);
  const saveHours = () => updateTenant(tenant, (current) => updateTodayClosingTime(current, facilityId, closingTime), 'Operating hours saved');
  const createClosure = () => updateTenant(tenant, (current) => closeFacilityTemporarily(current, facilityId), `Temporary closure published for ${facility.shortName}`);
  const reopen = () => updateTenant(tenant, (current) => reopenFacility(current, facilityId), `${facility.shortName} is open and operating again`);

  return <div className="page-stack staff-page"><header className="page-header"><div><DataLabel>Recreation staff workspace</DataLabel><h1>Keep campus demand trustworthy.</h1><p>Update hours, closures, equipment supply, and activity availability.</p></div><span className="role-chip"><ShieldCheck />Authorized staff portal</span></header>
    <section className="staff-overview"><article><span><Clock3 /></span><strong>{state.facilities.length}</strong><p>Facilities reporting</p><small>All synthetic feeds current</small></article><article><span><Wrench /></span><strong>{state.facilityEquipment.filter((item) => item.universityId === state.university.id && item.operationalQuantity < item.totalQuantity).length}</strong><p>Equipment outages</p><small>Included in demand models</small></article><article><span><AlertTriangle /></span><strong>{activeClosureCount}</strong><p>Temporary closures</p><small>Recommendations exclude closures</small></article><article><span><Check /></span><strong>92%</strong><p>Report quality</p><small>Synthetic confidence score</small></article></section>
    <section className="admin-grid"><article className="admin-card"><div className="card-heading"><div><DataLabel>Equipment inventory</DataLabel><h2>Manage equipment availability</h2></div><Wrench /></div><div className="form-stack"><label>Facility<select value={facilityId} onChange={(event) => setFacilityId(event.target.value)}>{state.facilities.map((item) => <option key={item.id} value={item.id}>{item.shortName}</option>)}</select></label><label>Equipment<select value={equipmentId} onChange={(event) => setEquipmentId(event.target.value)}>{state.equipmentTypes.filter((type) => state.facilityEquipment.some((item) => item.universityId === state.university.id && item.facilityId === facilityId && item.equipmentTypeId === type.id && item.totalQuantity > 0)).map((item) => <option key={item.id} value={item.id}>{item.displayName}</option>)}</select></label><div className="inventory-read" aria-live="polite"><span>Operational</span><strong>{inventory?.operationalQuantity ?? 0} / {inventory?.totalQuantity ?? 0}</strong><StatusPill level={outageActive ? 'high' : 'low'}>{outageActive ? 'Outage active' : 'Back up and running'}</StatusPill></div><div className="inventory-actions"><Button onClick={markUnavailable} disabled={!inventory || inventory.operationalQuantity === 0}><Construction />Mark one unavailable</Button><Button variant="secondary" onClick={restore} disabled={!outageActive}><RotateCcw />Restore all units</Button></div></div></article>
      <article className="admin-card"><div className="card-heading"><div><DataLabel>Operating status</DataLabel><h2>Hours and closures</h2></div><DoorClosed /></div><div className="form-stack"><label>Today’s closing time<input type="time" value={closingTime} onChange={(event) => setClosingTime(event.target.value)} /></label><Button variant="secondary" onClick={saveHours}><Save />Save hours</Button><div className={`operating-state ${closureActive ? 'operating-state--closed' : ''}`} aria-live="polite">{closureActive ? <DoorClosed /> : <CheckCircle2 />}<div><strong>{closureActive ? 'Temporarily closed' : 'Open and operating'}</strong><small>{closureActive ? facility.specialClosure?.reason : 'No active staff closure'}</small></div></div><p className="muted-copy">Emergency or maintenance closures immediately remove this facility from recommendations.</p>{closureActive ? <Button variant="secondary" onClick={reopen}><Power />Reopen {facility.shortName} now</Button> : <Button variant="danger" onClick={createClosure}><DoorClosed />Close {facility.shortName} for 2 hours</Button>}</div></article>
      <article className="admin-card admin-card--wide"><div className="card-heading"><div><DataLabel>Anonymous forecast review</DataLabel><h2>{facility.shortName} right now</h2></div><StatusPill level={forecast.crowdLevel} /></div><div className="forecast-review"><div><strong>{forecast.expectedRange[0]}–{forecast.expectedRange[1]}</strong><span>predicted visitor range</span></div><div><strong>{forecast.plannedCount}</strong><span>declared plans in interval</span></div><div><strong>{forecast.confidence}</strong><span>forecast confidence</span></div></div><p className="source-copy">{forecast.sourceExplanation}</p></article></section>
  </div>;
}
