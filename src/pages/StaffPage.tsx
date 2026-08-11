import { Activity, AlertTriangle, ArrowRight, Check, CheckCircle2, ChevronDown, Clock3, Construction, DoorClosed, MapPin, Minus, Plus, Power, RotateCcw, Save, ShieldCheck, Users, Wrench } from 'lucide-react';
import { useState } from 'react';
import { Button, ConfirmationDialog, DataLabel, FormMessage, ManagementDataList, ManagementDataRow, ManagementMetric, ManagementMetricGrid, ManagementPageHeader, ManagementSectionHeader, ManagementToolbar, Modal, StatusPill } from '../components/ui';
import { ParticipationTracker } from '../components/ParticipationTracker';
import { useCampusFit } from '../data/CampusFitContext';
import { useTenant } from '../data/TenantContext';
import { approximateExpectedVisitors, forecastDemand, isSpecialClosureActive } from '../services/forecasting';
import { closeFacilityTemporarily, markEquipmentUnavailable, reopenFacility, restoreEquipment, updateTodayClosingTime } from '../services/staffOperations';
import { getFacilityParticipationTracker } from '../services/participationTracker';

type FacilityWorkspaceTab = 'overview' | 'equipment' | 'hours' | 'forecast';

export function StaffPage() {
  const { tenant, state } = useTenant();
  const { updateTenant } = useCampusFit();
  const [facilityId, setFacilityId] = useState(state.facilities[0]!.id);
  const [equipmentId, setEquipmentId] = useState('cable');
  const [restoreUnits, setRestoreUnits] = useState(1);
  const [issueUnits, setIssueUnits] = useState(1);
  const weekday = new Date(state.now).getDay();
  const closingTimeFor = (nextFacilityId: string) => state.facilities.find((item) => item.id === nextFacilityId)?.hours.find((hours) => hours.weekday === weekday)?.closingTime ?? '23:30';
  const [closingTime, setClosingTime] = useState(() => closingTimeFor(state.facilities[0]!.id));
  const [closureConfirmationOpen, setClosureConfirmationOpen] = useState(false);
  const [repairModalOpen, setRepairModalOpen] = useState(false);
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [expandedFacilityId, setExpandedFacilityId] = useState<string>();
  const [workspaceTab, setWorkspaceTab] = useState<FacilityWorkspaceTab>('overview');

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
  const participation = getFacilityParticipationTracker(state, facilityId);
  const unavailableQuantity = inventory ? Math.max(0, inventory.totalQuantity - inventory.operationalQuantity) : 0;
  const operationalPercentage = inventory?.totalQuantity
    ? Math.round(inventory.operationalQuantity / inventory.totalQuantity * 100)
    : 0;
  const outageActive = unavailableQuantity > 0;
  const restoreQuantity = Math.min(Math.max(1, restoreUnits), Math.max(1, unavailableQuantity));
  const restoreOptions = [...new Set([1, 3, unavailableQuantity])].filter((quantity) =>
    quantity > 0 && quantity <= unavailableQuantity);
  const operationalQuantity = inventory?.operationalQuantity ?? 0;
  const issueQuantity = Math.min(Math.max(1, issueUnits), Math.max(1, operationalQuantity));
  const issueOptions = [...new Set([1, 3, operationalQuantity])].filter((quantity) =>
    quantity > 0 && quantity <= operationalQuantity);
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
    setIssueUnits(1);
    setRepairModalOpen(false);
    setIssueModalOpen(false);
    setClosingTime(closingTimeFor(nextFacilityId));
  };

  const toggleFacilityManagement = (nextFacilityId: string) => {
    if (expandedFacilityId === nextFacilityId) {
      setExpandedFacilityId(undefined);
      return;
    }
    handleFacilityChange(nextFacilityId);
    setExpandedFacilityId(nextFacilityId);
    setWorkspaceTab('overview');
    window.requestAnimationFrame(() => document.getElementById('facility-workspace')?.scrollIntoView({ block: 'start' }));
  };

  const selectRestoreQuantity = (quantity: number) => {
    const wholeQuantity = Number.isFinite(quantity) ? Math.trunc(quantity) : 1;
    setRestoreUnits(Math.min(unavailableQuantity, Math.max(1, wholeQuantity)));
  };

  const selectIssueQuantity = (quantity: number) => {
    const wholeQuantity = Number.isFinite(quantity) ? Math.trunc(quantity) : 1;
    setIssueUnits(Math.min(operationalQuantity, Math.max(1, wholeQuantity)));
  };

  const markUnavailable = () => {
    updateTenant(
      tenant,
      (current) => markEquipmentUnavailable(current, facilityId, equipmentId, issueQuantity),
      `${issueQuantity} ${equipment?.displayName ?? 'equipment'} ${issueQuantity === 1 ? 'unit' : 'units'} marked out of service — student forecasts recalculated`
    );
    setIssueUnits(1);
    setIssueModalOpen(false);
  };
  const restore = () => {
    const remainingQuantity = unavailableQuantity - restoreQuantity;
    updateTenant(
      tenant,
      (current) => restoreEquipment(current, facilityId, equipmentId, restoreQuantity),
      `${restoreQuantity} ${equipment?.displayName ?? 'equipment'} ${restoreQuantity === 1 ? 'unit' : 'units'} restored — ${remainingQuantity === 0 ? 'all units are back up and running' : `${remainingQuantity} still out of service`}`
    );
    setRestoreUnits(1);
    setRepairModalOpen(false);
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
    <ManagementPageHeader eyebrow="Recreation staff workspace" title="Campus operations at a glance" description="Review facility status, keep equipment availability current, and publish operational changes that shape student guidance." badge={<span className="role-chip"><ShieldCheck />Authorized staff portal</span>} />

    <ManagementMetricGrid label="Operations summary">
      <ManagementMetric icon={<Clock3 />} value={state.facilities.length} label="Facilities reporting" note="All synthetic feeds current" tone="positive" />
      <ManagementMetric icon={<Wrench />} value={state.facilityEquipment.filter((item) => item.universityId === state.university.id && item.operationalQuantity < item.totalQuantity).length} label="Equipment outages" note="Included in demand models" tone="warning" />
      <ManagementMetric icon={<AlertTriangle />} value={activeClosureCount} label="Temporary closures" note="Excluded from recommendations" tone={activeClosureCount > 0 ? 'warning' : 'positive'} />
      <ManagementMetric icon={<Check />} value="92%" label="Report quality" note="Synthetic confidence score" />
    </ManagementMetricGrid>

    <section className="admin-card operations-list-card">
      <ManagementSectionHeader eyebrow="Network status" title="Facility overview" description="Current operating state and anonymous demand guidance across campus." />
      <ManagementDataList label="Campus operations status">
        {state.facilities.map((item) => {
          const itemForecast = forecastDemand(state, item.id);
          const isClosed = isSpecialClosureActive(item, state.now);
          const outageCount = state.facilityEquipment.filter((entry) => entry.universityId === state.university.id && entry.facilityId === item.id && entry.operationalQuantity < entry.totalQuantity).length;
          const expanded = expandedFacilityId === item.id;
          const detailsId = `facility-overview-${item.id}`;
          return <ManagementDataRow key={item.id} title={item.shortName} meta={isClosed ? item.specialClosure?.reason ?? 'Temporary closure' : `${outageCount} equipment ${outageCount === 1 ? 'issue' : 'issues'}`} details={<><strong>About {approximateExpectedVisitors(itemForecast)}</strong><span>past-data estimate · {itemForecast.confidence} confidence</span><span className="sr-only">Underlying model range {itemForecast.expectedRange[0]}–{itemForecast.expectedRange[1]}. {itemForecast.sourceExplanation}</span></>} detailsId={detailsId} expanded={expanded} status={<StatusPill level={isClosed ? 'high' : itemForecast.crowdLevel}>{isClosed ? 'Closed' : undefined}</StatusPill>} selected={expanded} action={<button type="button" className="management-row-action" aria-expanded={expanded} aria-controls={detailsId} onClick={() => toggleFacilityManagement(item.id)}>Manage<span className="sr-only"> {item.shortName}</span><ChevronDown aria-hidden="true" /></button>} />;
        })}
      </ManagementDataList>
    </section>

    {expandedFacilityId ? <section id="facility-workspace" className="facility-management-workspace" aria-label={`Managing ${facility.shortName}`}>
      <div className="facility-workspace-context">
        <div><DataLabel>Managing facility</DataLabel><h2>{facility.name}</h2><p><MapPin />{facility.address}</p></div>
        <dl><div><dt><Users />Capacity</dt><dd>{facility.capacity}</dd></div><div><dt><Activity />Activities</dt><dd>{facility.activities.length}</dd></div><div><dt><Clock3 />Today</dt><dd>{closingTimeFor(facilityId)}</dd></div></dl>
      </div>

      <div className="facility-workspace-tabs" role="tablist" aria-label={`${facility.shortName} management sections`}>
        <button id="facility-tab-overview" type="button" role="tab" aria-controls="facility-workspace-panel" aria-selected={workspaceTab === 'overview'} onClick={() => setWorkspaceTab('overview')}><Users aria-hidden="true" />Overview</button>
        <button id="facility-tab-equipment" type="button" role="tab" aria-controls="facility-workspace-panel" aria-selected={workspaceTab === 'equipment'} onClick={() => setWorkspaceTab('equipment')}><Wrench aria-hidden="true" />Equipment</button>
        <button id="facility-tab-hours" type="button" role="tab" aria-controls="facility-workspace-panel" aria-selected={workspaceTab === 'hours'} onClick={() => setWorkspaceTab('hours')}><DoorClosed aria-hidden="true" />Hours</button>
        <button id="facility-tab-forecast" type="button" role="tab" aria-controls="facility-workspace-panel" aria-selected={workspaceTab === 'forecast'} onClick={() => setWorkspaceTab('forecast')}><Activity aria-hidden="true" />Forecast</button>
      </div>

      <div id="facility-workspace-panel" className="facility-workspace-panel" role="tabpanel" aria-labelledby={`facility-tab-${workspaceTab}`}>
      {workspaceTab === 'overview' ? <ParticipationTracker tracker={participation} facilityName={facility.shortName} timezone={state.university.timezone} /> : null}

      {workspaceTab === 'equipment' ? <article className="admin-card equipment-admin-card">
        <ManagementSectionHeader eyebrow="Equipment inventory" title="Equipment availability" description="Choose a resource, review its live status, then record a completed repair or outage." icon={<Wrench />} />

        <ManagementToolbar label="Equipment filters">
        <div className="equipment-selector-grid">
          <label>Equipment type<select value={equipmentId} onChange={(event) => { setEquipmentId(event.target.value); setRestoreUnits(1); setIssueUnits(1); setRepairModalOpen(false); setIssueModalOpen(false); }}>{facilityEquipmentTypes.map((item) => <option key={item.id} value={item.id}>{item.displayName}</option>)}</select></label>
        </div>
        </ManagementToolbar>

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

          <div className="equipment-action-grid">
            {outageActive ? <Button className="equipment-action-button equipment-action-button--repair" variant="secondary" onClick={() => setRepairModalOpen(true)}><RotateCcw /><span><strong>Record repair</strong><small>{unavailableQuantity} {unavailableQuantity === 1 ? 'unit' : 'units'} eligible</small></span></Button> : <div className="equipment-all-clear"><CheckCircle2 /><span><strong>Everything is ready</strong><small>No repairs to record</small></span></div>}
            <Button className="equipment-action-button equipment-action-button--outage" variant="ghost" onClick={() => setIssueModalOpen(true)} disabled={!inventory || inventory.operationalQuantity === 0}><Construction /><span><strong>Report issue</strong><small>Choose number of units</small></span></Button>
          </div>
        </section>
      </article> : null}

      {workspaceTab === 'hours' ? <article className="admin-card facility-hours-card">
        <ManagementSectionHeader eyebrow="Operating status" title="Hours and closures" icon={<DoorClosed />} />
        <div className="form-stack"><label htmlFor="facility-closing-time">Today’s closing time<input id="facility-closing-time" type="time" value={closingTime} aria-describedby="closing-time-help" onChange={(event) => setClosingTime(event.target.value)} /></label><FormMessage id="closing-time-help">Updates today’s published closing time for {facility.shortName}.</FormMessage><Button variant="secondary" onClick={saveHours} disabled={!closingTime}><Save />Save hours</Button><div className={`operating-state ${closureActive ? 'operating-state--closed' : ''}`} aria-live="polite">{closureActive ? <DoorClosed /> : <CheckCircle2 />}<div><strong>{closureActive ? 'Temporarily closed' : 'Open and operating'}</strong><small>{closureActive ? facility.specialClosure?.reason : 'No active staff closure'}</small></div></div><p className="muted-copy">Emergency or maintenance closures immediately remove this facility from recommendations.</p>{closureActive ? <Button variant="secondary" onClick={reopen}><Power />Reopen {facility.shortName} now</Button> : <Button variant="danger" onClick={() => setClosureConfirmationOpen(true)}><DoorClosed />Close {facility.shortName} for 2 hours</Button>}</div>
      </article> : null}

      {workspaceTab === 'forecast' ? <article className="admin-card facility-forecast-card"><ManagementSectionHeader eyebrow="Anonymous forecast review" title={`${facility.shortName} right now`} status={<StatusPill level={forecast.crowdLevel} />} /><div className="forecast-review"><div><strong>About {approximateExpectedVisitors(forecast)}</strong><span>expected from past data</span></div><div><strong>{forecast.plannedCount}</strong><span>declared plans in interval</span></div><div><strong>{forecast.confidence}</strong><span>forecast confidence</span></div></div><p className="source-copy">Mock data — live CampusFit use or university data is required for a real estimate. Underlying model range: {forecast.expectedRange[0]}–{forecast.expectedRange[1]}. {forecast.sourceExplanation}</p></article> : null}
      </div>
    </section> : null}
    <Modal open={repairModalOpen && outageActive} title={`Record ${equipment?.displayName ?? 'equipment'} repair`} description={`Only restore units that passed maintenance at ${facility.shortName}.`} label="Completed repair" onClose={() => setRepairModalOpen(false)}>
      <div className="repair-modal-content">
        <div className="repair-quantity-field">
          <label htmlFor="restore-quantity">Units repaired</label>
          <div className="repair-quantity-control">
            <button type="button" aria-label="Decrease restored units" disabled={restoreQuantity <= 1} onClick={() => selectRestoreQuantity(restoreQuantity - 1)}><Minus /></button>
            <div className="repair-quantity-value"><input id="restore-quantity" type="number" inputMode="numeric" min={1} max={unavailableQuantity} value={restoreQuantity} onChange={(event) => selectRestoreQuantity(Number(event.target.value))} /><span>{restoreQuantity === 1 ? 'unit' : 'units'}</span></div>
            <button type="button" aria-label="Increase restored units" disabled={restoreQuantity >= unavailableQuantity} onClick={() => selectRestoreQuantity(restoreQuantity + 1)}><Plus /></button>
          </div>
        </div>
        <div className="repair-quick-row" role="group" aria-label="Quick restoration quantities">{restoreOptions.map((quantity) => <button type="button" key={quantity} className={restoreQuantity === quantity ? 'is-selected' : ''} aria-pressed={restoreQuantity === quantity} onClick={() => selectRestoreQuantity(quantity)}>{quantity === unavailableQuantity ? `All ${quantity}` : quantity}</button>)}</div>
        <div className="repair-outcome" aria-live="polite"><span>{inventory?.operationalQuantity ?? 0} / {inventory?.totalQuantity ?? 0}</span><ArrowRight /><strong>{(inventory?.operationalQuantity ?? 0) + restoreQuantity} / {inventory?.totalQuantity ?? 0}</strong><small>after repair</small></div>
        <small className="repair-limit-note">Up to {unavailableQuantity} {unavailableQuantity === 1 ? 'unit is' : 'units are'} eligible to restore.</small>
        <Button className="repair-confirm-button" onClick={restore}><CheckCircle2 />Restore {restoreQuantity} {restoreQuantity === 1 ? 'unit' : 'units'}</Button>
      </div>
    </Modal>
    <Modal open={issueModalOpen && operationalQuantity > 0} title={`Report ${equipment?.displayName ?? 'equipment'} issue`} description={`Choose how many currently operational units should be removed from student availability at ${facility.shortName}.`} label="Equipment outage" onClose={() => setIssueModalOpen(false)}>
      <div className="repair-modal-content issue-modal-content">
        <div className="repair-quantity-field">
          <label htmlFor="issue-quantity">Units out of service</label>
          <div className="repair-quantity-control">
            <button type="button" aria-label="Decrease unavailable units" disabled={issueQuantity <= 1} onClick={() => selectIssueQuantity(issueQuantity - 1)}><Minus /></button>
            <div className="repair-quantity-value"><input id="issue-quantity" type="number" inputMode="numeric" min={1} max={operationalQuantity} value={issueQuantity} onChange={(event) => selectIssueQuantity(Number(event.target.value))} /><span>{issueQuantity === 1 ? 'unit' : 'units'}</span></div>
            <button type="button" aria-label="Increase unavailable units" disabled={issueQuantity >= operationalQuantity} onClick={() => selectIssueQuantity(issueQuantity + 1)}><Plus /></button>
          </div>
        </div>
        <div className="repair-quick-row" role="group" aria-label="Quick outage quantities">{issueOptions.map((quantity) => <button type="button" key={quantity} className={issueQuantity === quantity ? 'is-selected' : ''} aria-pressed={issueQuantity === quantity} onClick={() => selectIssueQuantity(quantity)}>{quantity === operationalQuantity ? `All ${quantity}` : quantity}</button>)}</div>
        <div className="repair-outcome issue-outcome" aria-live="polite"><span>{operationalQuantity} / {inventory?.totalQuantity ?? 0}</span><ArrowRight /><strong>{operationalQuantity - issueQuantity} / {inventory?.totalQuantity ?? 0}</strong><small>after report</small></div>
        <small className="repair-limit-note">Up to {operationalQuantity} operational {operationalQuantity === 1 ? 'unit is' : 'units are'} available to report.</small>
        <Button variant="danger" className="repair-confirm-button" onClick={markUnavailable}><Construction />Mark {issueQuantity} {issueQuantity === 1 ? 'unit' : 'units'} out of service</Button>
      </div>
    </Modal>
    <ConfirmationDialog open={closureConfirmationOpen} title={`Temporarily close ${facility.shortName}?`} description="For the next two hours, CampusFit will exclude this facility from student recommendations. You can reopen it at any time." confirmLabel={`Close ${facility.shortName}`} tone="danger" onClose={() => setClosureConfirmationOpen(false)} onConfirm={() => { createClosure(); setClosureConfirmationOpen(false); }} />
  </div>;
}
