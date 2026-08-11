import { ArrowLeft, ArrowRight, CalendarClock, CalendarDays, CheckCircle2, Clock3, Dumbbell, Info, MapPin, RefreshCw, Sparkles, UsersRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { FacilityActivityGrid, FacilityAvailability, FacilityHoursList } from '../components/FacilityPresentation';
import { ParticipationTracker } from '../components/ParticipationTracker';
import { DataLabel, DataSourceLabel, ForecastEstimate, ProgressBar, StatusPill } from '../components/ui';
import { WorkoutEquipmentStatus } from '../components/WorkoutEquipmentStatus';
import { workoutFocuses } from '../data/catalog';
import { useTenant } from '../data/TenantContext';
import { crowdLabel, formatTime, formatTimeInput } from '../lib/format';
import { calculateEquipmentDemand } from '../services/equipmentDemand';
import { approximateExpectedVisitors, forecastDemand } from '../services/forecasting';
import { getLiveAggregate } from '../services/liveAggregation';
import { getFacilityParticipationTracker } from '../services/participationTracker';

type Tab = 'overview' | 'schedule' | 'equipment' | 'activities';

const tabs: Array<{ id: Tab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'equipment', label: 'Equipment' },
  { id: 'activities', label: 'Activities' }
];

export function FacilityDetailPage() {
  const { facilityId } = useParams();
  const { tenant, state } = useTenant();
  const [tab, setTab] = useState<Tab>('overview');
  const [focus, setFocus] = useState('back');
  const facility = state.facilities.find((item) => item.id === facilityId);
  const aggregate = facility ? getLiveAggregate(state, facility.id) : undefined;
  const participation = facility ? getFacilityParticipationTracker(state, facility.id) : undefined;
  const forecast = facility ? forecastDemand(state, facility.id) : undefined;
  const equipment = useMemo(() => facility ? calculateEquipmentDemand(state, facility.id, state.now, focus)
    .filter((item) => state.equipmentTypes.find((type) => type.id === item.equipmentTypeId)?.supportedFocuses.includes(focus)) : [], [state, facility, focus]);

  if (!facility || !aggregate || !forecast || !participation) return <Navigate to={`/${tenant}/facilities`} replace />;

  const futureTimes = [0, 60, 120, 180, 240, 300].map((minutes) => {
    const at = new Date(Date.parse(state.now) + minutes * 60_000).toISOString();
    return { at, forecast: forecastDemand(state, facility.id, at) };
  });
  const bestTime = futureTimes.reduce((best, item) => ((item.forecast.expectedRange[0] + item.forecast.expectedRange[1]) < (best.forecast.expectedRange[0] + best.forecast.expectedRange[1]) ? item : best));
  const peakTime = futureTimes.reduce((peak, item) => ((item.forecast.expectedRange[0] + item.forecast.expectedRange[1]) > (peak.forecast.expectedRange[0] + peak.forecast.expectedRange[1]) ? item : peak));
  const plannedVisit = state.visits.find((visit) => visit.userId === state.currentUser.id && visit.facilityId === facility.id && ['planned', 'delayed'].includes(visit.status));
  const predictedCapacityShare = Math.round(((forecast.expectedRange[0] + forecast.expectedRange[1]) / 2) / facility.capacity * 100);
  const planPath = `/${tenant}/plan?facility=${facility.id}`;
  const schedulePlanPath = `${planPath}&time=${formatTimeInput(bestTime.at, state.university.timezone)}`;

  return <div className="page-stack facility-detail-page">
    <Link className="back-link" to={`/${tenant}/facilities`}><ArrowLeft size={17} /> All facilities</Link>

    <header className="facility-detail-hero">
      <div className="facility-detail-copy">
        <DataLabel>{state.university.shortName} recreation facility</DataLabel>
        <h1>{facility.name}</h1>
        <p>{facility.description}</p>
        <FacilityAvailability facility={facility} at={state.now} />
        <div className="facility-detail-meta">
          <span><MapPin aria-hidden="true" />{facility.address}</span>
          <span><Clock3 aria-hidden="true" />{facility.travelMinutes} min away</span>
        </div>
        <div className="facility-detail-actions">
          <Link className="button button--primary button--medium" to={planPath}>Plan a visit <ArrowRight aria-hidden="true" /></Link>
          <Link className="button button--ghost button--medium" to={`/${tenant}/facilities`}>Compare facilities</Link>
        </div>
      </div>
      <aside className="facility-live-card" aria-label="Current CampusFit prediction">
        <div><span className="live-beacon" aria-hidden="true" /> Current CampusFit view</div>
        <ForecastEstimate forecast={forecast} className="forecast-estimate--inverse" />
        <small className="facility-live-context"><strong>{crowdLabel(forecast.crowdLevel)} demand</strong><span>{aggregate.campusFitCheckIns} voluntary CampusFit check-ins · not official occupancy</span></small>
      </aside>
    </header>

    <nav className="detail-tabs" aria-label="Facility information">
      {tabs.map((item) => <button key={item.id} aria-pressed={tab === item.id} className={tab === item.id ? 'is-active' : ''} onClick={() => setTab(item.id)}>{item.label}</button>)}
    </nav>

    {tab === 'overview' ? <section className="facility-overview-panel" aria-labelledby="facility-overview-title">
      <div className="facility-detail-metrics" aria-label="Facility at a glance">
        <article><span><UsersRound aria-hidden="true" /></span><div><strong>About {approximateExpectedVisitors(forecast)}</strong><small>expected from past data</small></div></article>
        <article><span><Dumbbell aria-hidden="true" /></span><div><strong>{facility.capacity}</strong><small>facility capacity reference</small></div></article>
        <article><span><Clock3 aria-hidden="true" /></span><div><strong>{facility.travelMinutes} min</strong><small>estimated travel time</small></div></article>
      </div>
      <ParticipationTracker tracker={participation} facilityName={facility.shortName} timezone={state.university.timezone} />
      <div className="detail-grid">
        <article className="detail-card detail-card--wide">
          <div className="card-heading"><div><DataLabel>Current availability</DataLabel><h2 id="facility-overview-title">Plan with useful context</h2></div><UsersRound aria-hidden="true" /></div>
          <div className="now-summary-grid">
            <div><DataLabel>Voluntary participation</DataLabel><strong className="now-checkin-value">{aggregate.campusFitCheckIns}</strong><p>CampusFit users checked in</p><DataSourceLabel>Updated {formatTime(aggregate.updatedAt, state.university.timezone)} · not official occupancy</DataSourceLabel></div>
            <div><DataLabel>CampusFit prediction</DataLabel><h2>{crowdLabel(forecast.crowdLevel)}</h2><ForecastEstimate forecast={forecast} /><StatusPill level={forecast.confidence}>{forecast.confidence} confidence</StatusPill></div>
          </div>
          <ProgressBar value={predictedCapacityShare} label={`About ${approximateExpectedVisitors(forecast)} expected visitors compared with facility capacity ${facility.capacity}`} />
          <p className="capacity-context">The indicator compares CampusFit’s approximate past-data estimate with the facility capacity reference. It is not a live occupancy meter.</p>
          <p className="source-copy"><Info aria-hidden="true" />{forecast.sourceExplanation}</p>
          <div className="driver-list">{forecast.drivers.map((driver) => <span key={driver}><CheckCircle2 aria-hidden="true" />{driver}</span>)}</div>
        </article>
        <article className="detail-card"><DataLabel>Top workout focuses</DataLabel><h2>Popular right now</h2><div className="aggregate-list">{aggregate.focusCounts.length ? aggregate.focusCounts.map((item) => <div key={item.key}><span>{item.label}</span><b>{item.suppressed ? 'Low activity' : item.count}</b></div>) : <p>No focus data yet.</p>}</div></article>
        <article className="detail-card"><DataLabel>Top activities</DataLabel><h2>CampusFit participation</h2><div className="aggregate-list">{aggregate.activityCounts.length ? aggregate.activityCounts.map((item) => <div key={item.key}><span>{item.label}</span><b>{item.suppressed ? 'Low activity' : item.count}</b></div>) : <p>No activity clears the privacy threshold.</p>}</div><small className="threshold-note">Counts under {state.university.privacyCountThreshold} are suppressed.</small></article>
      </div>
    </section> : null}

    {tab === 'schedule' ? <section className="facility-schedule-panel" aria-labelledby="facility-schedule-title">
      <div className="schedule-lead-grid">
        <article className="detail-card schedule-hours-card">
          <div className="card-heading"><div><DataLabel>Operating hours</DataLabel><h2 id="facility-schedule-title">Today first, then the week</h2></div><CalendarDays aria-hidden="true" /></div>
          <FacilityAvailability facility={facility} at={state.now} />
          <FacilityHoursList facility={facility} at={state.now} />
        </article>
        <article className="detail-card schedule-next-action">
          <span><Sparkles aria-hidden="true" /></span>
          <DataLabel>Best forecast window</DataLabel>
          <h2>{formatTime(bestTime.at, state.university.timezone)}</h2>
          <ForecastEstimate forecast={bestTime.forecast} />
          {plannedVisit?.plannedArrivalAt ? <div className="planned-visit-note"><CalendarClock aria-hidden="true" /><span><strong>Your existing plan</strong>{formatTime(plannedVisit.plannedArrivalAt, state.university.timezone)} · {plannedVisit.status}</span></div> : null}
          <Link className="button button--primary button--medium" to={schedulePlanPath}>Plan for this time <ArrowRight aria-hidden="true" /></Link>
        </article>
      </div>

      <article className="detail-card later-card">
        <div className="card-heading"><div><DataLabel>Next five hours</DataLabel><h2>Expected demand by arrival time</h2><p>Forecast availability is separate from operating hours and scheduled activities.</p></div><CalendarClock aria-hidden="true" /></div>
        <div className="forecast-highlights"><span className="is-best"><small>Best time</small><strong>{formatTime(bestTime.at, state.university.timezone)}</strong></span><span><small>Peak time</small><strong>{formatTime(peakTime.at, state.university.timezone)}</strong></span>{plannedVisit?.plannedArrivalAt ? <span className="is-planned"><small>Your plan</small><strong>{formatTime(plannedVisit.plannedArrivalAt, state.university.timezone)}</strong></span> : null}</div>
        <ol className="timeline-list" aria-label="CampusFit demand forecast by arrival time">{futureTimes.map(({ at, forecast: item }) => {
          const capacityShare = Math.round(((item.expectedRange[0] + item.expectedRange[1]) / 2) / facility.capacity * 100);
          const isPlanned = plannedVisit?.plannedArrivalAt && Math.abs(Date.parse(plannedVisit.plannedArrivalAt) - Date.parse(at)) < 31 * 60_000;
          return <li key={at} className={isPlanned ? 'is-planned' : ''}><time>{formatTime(at, state.university.timezone)}</time><span className={`timeline-bar timeline-bar--${item.crowdLevel}`} role="progressbar" aria-label={`${formatTime(at, state.university.timezone)} predicted demand`} aria-valuemin={0} aria-valuemax={facility.capacity} aria-valuenow={approximateExpectedVisitors(item)} style={{ '--bar-width': `${capacityShare}%` } as React.CSSProperties} /><StatusPill level={item.crowdLevel} /><b>About {approximateExpectedVisitors(item)}</b><span className="sr-only">Underlying model range {item.expectedRange[0]}–{item.expectedRange[1]}; {item.confidence} confidence. {item.sourceExplanation}</span></li>;
        })}</ol>
        <p className="later-summary">Your best bet is around <strong>{formatTime(bestTime.at, state.university.timezone)}</strong>. Demand is expected to peak near <strong>{formatTime(peakTime.at, state.university.timezone)}</strong>; ranges remain predictions, not official occupancy.</p>
        <DataSourceLabel>Mock historical pattern + planned visits + live CampusFit check-ins · {bestTime.forecast.confidence} confidence. Live CampusFit use or university data is required for a real estimate.</DataSourceLabel>
      </article>

      <article className="detail-card schedule-data-note">
        <span><Info aria-hidden="true" /></span>
        <div><DataLabel>Scheduled activities</DataLabel><h2>Session-level times are not connected</h2><p>CampusFit currently knows which activities this facility supports, but it does not receive class, court, or session schedules. Confirm exact session times with the university recreation provider.</p></div>
        <button type="button" className="text-link" onClick={() => setTab('activities')}>View supported activities <ArrowRight aria-hidden="true" /></button>
      </article>
    </section> : null}

    {tab === 'equipment' ? <div className="equipment-tab-stack"><section className="detail-card equipment-focus-control"><div className="filter-row"><div><DataLabel>Plan around service interruptions</DataLabel><h2>Choose your workout</h2><p>We’ll show only equipment that matters for this focus.</p></div><label>Workout focus<select value={focus} onChange={(event) => setFocus(event.target.value)}>{workoutFocuses.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label></div></section><WorkoutEquipmentStatus state={state} facilityId={facility.id} focus={focus} comparePath={`/${tenant}/facilities`} /><section className="detail-card"><div className="card-heading"><div><DataLabel>Demand after availability</DataLabel><h2>Expected waits for your workout</h2></div><Dumbbell aria-hidden="true" /></div><div className="equipment-table" role="table" aria-label="Equipment demand"><div role="row" className="equipment-row equipment-row--head"><span role="columnheader">Equipment</span><span role="columnheader">Operational</span><span role="columnheader">Demand</span><span role="columnheader">Likely wait</span></div>{equipment.map((item) => <div role="row" className="equipment-row" key={item.equipmentTypeId}><span role="cell"><Dumbbell aria-hidden="true" /><b>{item.displayName}</b><small>{item.explanation}</small></span><span role="cell">{item.operationalQuantity}</span><span role="cell"><StatusPill level={item.demandLevel} /></span><span role="cell">{item.queueRange[0]}–{item.queueRange[1]} min</span></div>)}</div></section></div> : null}

    {tab === 'activities' ? <section className="facility-activities-panel" aria-labelledby="facility-activities-title">
      <article className="detail-card">
        <div className="card-heading"><div><DataLabel>Supported at {facility.shortName}</DataLabel><h2 id="facility-activities-title">Activities and spaces</h2><p>Choose an activity to open the existing CampusFit planning flow with this facility selected.</p></div><Dumbbell aria-hidden="true" /></div>
        <FacilityActivityGrid facility={facility} getActivityHref={(activity) => `/${tenant}/plan?intent=activity&activity=${activity}&facility=${facility.id}`} />
      </article>
      <article className="detail-card activity-schedule-note"><CalendarClock aria-hidden="true" /><div><h2>Availability is not a session schedule</h2><p>These activities are supported by the facility. Exact class, court, pool, or studio times are not currently connected to CampusFit.</p></div></article>
    </section> : null}

    <div className="source-footer"><RefreshCw aria-hidden="true" /><p>Forecast generated for {formatTime(state.now, state.university.timezone)} from synthetic historical patterns, declared visits, active CampusFit check-ins, hours, and equipment status. CampusFit check-ins do not equal official occupancy.</p></div>
  </div>;
}
