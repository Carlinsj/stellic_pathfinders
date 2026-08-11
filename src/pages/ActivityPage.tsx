import { AlertTriangle, ArrowRight, Clock3, Dumbbell, Info, MapPin, SlidersHorizontal, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { DataLabel, EmptyState, SectionHeader, StatusPill } from '../components/ui';
import { WorkoutEquipmentStatus } from '../components/WorkoutEquipmentStatus';
import { activities, workoutFocuses } from '../data/catalog';
import { useTenant } from '../data/TenantContext';
import { calculateEquipmentDemand } from '../services/equipmentDemand';

export function ActivityPage() {
  const { tenant, state } = useTenant();
  const [search] = useSearchParams();
  const requestedFacility = search.get('facility');
  const requestedFocus = search.get('focus');
  const [facilityId, setFacilityId] = useState(state.facilities.some((facility) => facility.id === requestedFacility) ? requestedFacility! : state.currentUser.preferredFacilityId ?? state.facilities[0]!.id);
  const [mode, setMode] = useState<'focus' | 'activity'>('focus');
  const [selection, setSelection] = useState(workoutFocuses.some((focus) => focus.key === requestedFocus) ? requestedFocus! : 'back');
  const facility = state.facilities.find((item) => item.id === facilityId)!;
  const demands = useMemo(() => calculateEquipmentDemand(state, facilityId, state.now, mode === 'focus' ? selection : undefined, mode === 'activity' ? selection : undefined).filter((item) => mode === 'activity' || state.equipmentTypes.find((type) => type.id === item.equipmentTypeId)?.supportedFocuses.includes(selection)).slice(0, 10), [state, facilityId, mode, selection]);
  const selectionLabel = (mode === 'focus' ? workoutFocuses : activities).find((item) => item.key === selection)?.label ?? selection.replaceAll('_', ' ');
  const highDemandCount = demands.filter((item) => ['high', 'very_high'].includes(item.demandLevel)).length;
  const planPath = mode === 'activity'
    ? `/${tenant}/plan?intent=activity&activity=${selection}&facility=${facilityId}`
    : `/${tenant}/plan?focus=${selection}&facility=${facilityId}`;

  const changeMode = (nextMode: 'focus' | 'activity') => {
    setMode(nextMode);
    setSelection(nextMode === 'focus' ? 'back' : facility.activities.includes('badminton') ? 'badminton' : facility.activities[0] ?? '');
  };
  const changeFacility = (nextFacilityId: string) => {
    const nextFacility = state.facilities.find((item) => item.id === nextFacilityId)!;
    setFacilityId(nextFacilityId);
    if (mode === 'activity' && !nextFacility.activities.includes(selection)) setSelection(nextFacility.activities[0] ?? '');
  };

  return <div className="page-stack activity-page">
    <header className="page-header activity-page-header"><div><DataLabel>Explore activity and equipment demand</DataLabel><h1>Plan around the resources you need.</h1><p>Compare estimated waits for a workout focus or a supported recreation activity.</p></div><Link className="button button--primary button--medium" to={planPath}>Plan this visit <ArrowRight aria-hidden="true" /></Link></header>

    <section className="demand-filter-card" aria-labelledby="demand-filter-title">
      <div className="demand-filter-intro"><DataLabel>Explore by purpose</DataLabel><h2 id="demand-filter-title">What do you want to do?</h2><p>Choose a facility and CampusFit will show only the relevant resources.</p></div>
      <div className="filter-toggle" aria-label="Demand type">
        <button type="button" aria-pressed={mode === 'focus'} className={mode === 'focus' ? 'is-active' : ''} onClick={() => changeMode('focus')}><Dumbbell aria-hidden="true" />Workout focus</button>
        <button type="button" aria-pressed={mode === 'activity'} className={mode === 'activity' ? 'is-active' : ''} onClick={() => changeMode('activity')}><SlidersHorizontal aria-hidden="true" />Activity</button>
      </div>
      <div className="filter-fields">
        <label>Facility<select value={facilityId} onChange={(event) => changeFacility(event.target.value)}>{state.facilities.map((item) => <option value={item.id} key={item.id}>{item.shortName}</option>)}</select></label>
        <label>{mode === 'focus' ? 'Workout focus' : 'Activity'}<select value={selection} onChange={(event) => setSelection(event.target.value)}>{(mode === 'focus' ? workoutFocuses : activities.filter((item) => facility.activities.includes(item.key))).map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label>
      </div>
    </section>

    <section className="demand-summary" aria-labelledby="demand-summary-title">
      <div><span className="kicker"><Sparkles size={14} aria-hidden="true" />{mode === 'activity' ? 'Activity-specific view' : 'Workout-specific view'}</span><h2 id="demand-summary-title">{selectionLabel} at {facility.shortName}</h2><p>CampusFit combines relevant resource supply, active and planned participation, typical duration, and known outages.</p><div className="demand-summary-actions"><Link to={`/${tenant}/facilities/${facility.id}`}>Facility details <ArrowRight aria-hidden="true" /></Link><Link to={planPath}>Plan with this selection <ArrowRight aria-hidden="true" /></Link></div></div>
      <div className="demand-alert"><AlertTriangle aria-hidden="true" /><strong>{highDemandCount}</strong><span>high-demand {highDemandCount === 1 ? 'resource' : 'resources'}</span></div>
    </section>

    <section className="demand-at-a-glance" aria-label="Demand overview">
      <article><span><MapPin aria-hidden="true" /></span><div><strong>{facility.shortName}</strong><small>{facility.travelMinutes} min away</small></div></article>
      <article><span><Dumbbell aria-hidden="true" /></span><div><strong>{demands.length}</strong><small>relevant resources</small></div></article>
      <article><span><Clock3 aria-hidden="true" /></span><div><strong>{demands[0]?.confidence ?? 'low'}</strong><small>estimate confidence</small></div></article>
    </section>

    {mode === 'focus' ? <WorkoutEquipmentStatus state={state} facilityId={facilityId} focus={selection} comparePath={`/${tenant}/facilities`} /> : null}

    <section aria-labelledby="resource-demand-title"><SectionHeader eyebrow="Resource outlook" title="Likely waits" titleId="resource-demand-title" description={`Estimated ranges for ${selectionLabel.toLowerCase()} at ${facility.shortName}.`} />
      {demands.length ? <div className="demand-card-grid">{demands.map((item) => <article className="demand-card" key={item.equipmentTypeId}><div><span className="equipment-icon"><Dumbbell aria-hidden="true" /></span><StatusPill level={item.demandLevel} /></div><h3>{item.displayName}</h3><p>{item.explanation}</p><footer><span><Clock3 aria-hidden="true" />Likely wait</span><strong>{item.queueRange[0]}–{item.queueRange[1]} min</strong></footer></article>)}</div> : <EmptyState title="No matching resources" body="This facility does not currently have a connected resource estimate for that selection." action={<Link className="button button--secondary button--medium" to={`/${tenant}/facilities`}>Compare facilities</Link>} />}
    </section>

    <div className="source-footer"><Info aria-hidden="true" /><p>Demand estimates are deterministic ranges, not promises. Confidence is {demands[0]?.confidence ?? 'low'} because official equipment sensors and university occupancy feeds are not connected.</p></div>
  </div>;
}
