import { ArrowLeft, CalendarClock, CheckCircle2, Clock3, Dumbbell, Info, MapPin, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { DataLabel, ProgressBar, StatusPill } from '../components/ui';
import { WorkoutEquipmentStatus } from '../components/WorkoutEquipmentStatus';
import { workoutFocuses } from '../data/catalog';
import { useTenant } from '../data/TenantContext';
import { crowdLabel, formatTime } from '../lib/format';
import { calculateEquipmentDemand } from '../services/equipmentDemand';
import { forecastDemand } from '../services/forecasting';
import { getLiveAggregate } from '../services/liveAggregation';

type Tab = 'live' | 'later' | 'equipment' | 'activities';

export function FacilityDetailPage() {
  const { facilityId } = useParams();
  const { tenant, state } = useTenant();
  const [tab, setTab] = useState<Tab>('live');
  const [focus, setFocus] = useState('back');
  const facility = state.facilities.find((item) => item.id === facilityId);
  const aggregate = facility ? getLiveAggregate(state, facility.id) : undefined;
  const forecast = facility ? forecastDemand(state, facility.id) : undefined;
  const equipment = useMemo(() => facility ? calculateEquipmentDemand(state, facility.id, state.now, focus)
    .filter((item) => state.equipmentTypes.find((type) => type.id === item.equipmentTypeId)?.supportedFocuses.includes(focus)) : [], [state, facility, focus]);
  if (!facility || !aggregate || !forecast) return <Navigate to={`/${tenant}/facilities`} replace />;
  const futureTimes = [0, 30, 60, 105, 150].map((minutes) => {
    const at = new Date(Date.parse(state.now) + minutes * 60_000).toISOString();
    return { at, forecast: forecastDemand(state, facility.id, at) };
  });
  return <div className="page-stack facility-detail-page">
    <Link className="back-link" to={`/${tenant}/facilities`}><ArrowLeft size={17} /> All facilities</Link>
    <header className="facility-detail-hero"><div className="facility-detail-copy"><DataLabel>{state.university.shortName} recreation facility</DataLabel><h1>{facility.name}</h1><p>{facility.description}</p><div><span><MapPin size={16} />{facility.address}</span><span><Clock3 size={16} />Open until {facility.hours[new Date(state.now).getDay()]?.closingTime ?? '—'}</span></div></div><div className="facility-live-card"><div><span className="live-beacon" /> Live CampusFit</div><strong>{aggregate.campusFitCheckIns}</strong><p>users checked in</p><StatusPill level={forecast.crowdLevel}>{crowdLabel(forecast.crowdLevel)} predicted overall</StatusPill><small>Updated from synthetic sources</small></div></header>
    <nav className="detail-tabs" aria-label="Facility information">{(['live', 'later', 'equipment', 'activities'] as const).map((item) => <button key={item} aria-current={tab === item ? 'page' : undefined} className={tab === item ? 'is-active' : ''} onClick={() => setTab(item)}>{item === 'live' ? 'Live now' : item === 'later' ? 'Later today' : item[0]!.toUpperCase() + item.slice(1)}</button>)}</nav>
    {tab === 'live' ? <section className="detail-grid"><article className="detail-card detail-card--wide"><div className="card-heading"><div><DataLabel>Estimated overall crowding</DataLabel><h2>{crowdLabel(forecast.crowdLevel)}</h2></div><StatusPill level={forecast.confidence}>{forecast.confidence} confidence</StatusPill></div><ProgressBar value={Math.round(((forecast.expectedRange[0] + forecast.expectedRange[1]) / 2) / facility.capacity * 100)} label={`Predicted visitor range ${forecast.expectedRange[0]}–${forecast.expectedRange[1]}`} /><p className="source-copy"><Info size={16} />{forecast.sourceExplanation}</p><div className="driver-list">{forecast.drivers.map((driver) => <span key={driver}><CheckCircle2 />{driver}</span>)}</div></article><article className="detail-card"><DataLabel>Workout focus</DataLabel><h2>Popular right now</h2><div className="aggregate-list">{aggregate.focusCounts.length ? aggregate.focusCounts.map((item) => <div key={item.key}><span>{item.label}</span><b>{item.suppressed ? 'Low activity' : item.count}</b></div>) : <p>No focus data yet.</p>}</div></article><article className="detail-card"><DataLabel>Activities</DataLabel><h2>What’s happening</h2><div className="aggregate-list">{aggregate.activityCounts.length ? aggregate.activityCounts.map((item) => <div key={item.key}><span>{item.label}</span><b>{item.suppressed ? 'Low activity' : item.count}</b></div>) : <p>No activity clears the privacy threshold.</p>}</div><small className="threshold-note">Counts under {state.university.privacyCountThreshold} are suppressed.</small></article></section> : null}
    {tab === 'later' ? <section className="detail-card"><div className="card-heading"><div><DataLabel>Next 2½ hours</DataLabel><h2>Find a better arrival window</h2></div><CalendarClock /></div><div className="timeline-list">{futureTimes.map(({ at, forecast: item }) => <div key={at}><time>{formatTime(at, state.university.timezone)}</time><span className={`timeline-bar timeline-bar--${item.crowdLevel}`} style={{ '--bar-width': `${Math.round(((item.expectedRange[0] + item.expectedRange[1]) / 2) / facility.capacity * 100)}%` } as React.CSSProperties} /><StatusPill level={item.crowdLevel} /><b>{item.expectedRange[0]}–{item.expectedRange[1]}</b></div>)}</div></section> : null}
    {tab === 'equipment' ? <div className="equipment-tab-stack"><section className="detail-card equipment-focus-control"><div className="filter-row"><div><DataLabel>Plan around service interruptions</DataLabel><h2>Choose your workout</h2><p>We’ll show only equipment that matters for this focus.</p></div><label>Workout focus<select value={focus} onChange={(event) => setFocus(event.target.value)}>{workoutFocuses.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label></div></section><WorkoutEquipmentStatus state={state} facilityId={facility.id} focus={focus} comparePath={`/${tenant}/facilities`} /><section className="detail-card"><div className="card-heading"><div><DataLabel>Demand after availability</DataLabel><h2>Expected waits for your workout</h2></div><Dumbbell /></div><div className="equipment-table" role="table" aria-label="Equipment demand"><div role="row" className="equipment-row equipment-row--head"><span>Equipment</span><span>Operational</span><span>Demand</span><span>Likely wait</span></div>{equipment.map((item) => <div role="row" className="equipment-row" key={item.equipmentTypeId}><span><Dumbbell size={17} /><b>{item.displayName}</b><small>{item.explanation}</small></span><span>{item.operationalQuantity}</span><span><StatusPill level={item.demandLevel} /></span><span>{item.queueRange[0]}–{item.queueRange[1]} min</span></div>)}</div></section></div> : null}
    {tab === 'activities' ? <section className="detail-card"><DataLabel>Available at {facility.shortName}</DataLabel><h2>Activities and spaces</h2><div className="activity-tile-grid">{facility.activities.map((activity) => <article key={activity}><span>{activity.slice(0, 1).toUpperCase()}</span><div><h3>{activity.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())}</h3><p>Available today · Schedule may vary</p></div><CheckCircle2 /></article>)}</div></section> : null}
    <div className="source-footer"><RefreshCw size={16} /><p>Forecast generated for {formatTime(state.now, state.university.timezone)} from synthetic historical patterns, declared visits, active CampusFit check-ins, hours, and equipment status. CampusFit check-ins do not equal official occupancy.</p></div>
  </div>;
}
