import { ArrowRight, CalendarClock, Check, ChevronRight, Clock3, Dumbbell, MapPin, Navigation, ShieldCheck, Sparkles, Timer, UsersRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FacilityCard } from '../components/FacilityCard';
import { Button, DataLabel, Modal, SegmentedControl, StatusPill } from '../components/ui';
import { useCampusFit } from '../data/CampusFitContext';
import { useTenant } from '../data/TenantContext';
import { activities, workoutFocuses } from '../data/catalog';
import type { PrivacyLevel, VisitIntent } from '../domain/types';
import { crowdLabel, formatTime, formatTimeInput, replaceTime } from '../lib/format';
import { getLiveAggregate } from '../services/liveAggregation';
import { findBetterRecommendationWindow, getRecommendationGuidance, recommendFacilities } from '../services/recommendation';
import { changeActivity, changeWorkoutFocus, checkInPlannedVisit, checkOutVisit, delayVisit, extendVisit, spontaneousCheckIn } from '../services/visitLifecycle';

export function HomePage() {
  const { tenant, state } = useTenant();
  const { updateTenant } = useCampusFit();
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [lateOpen, setLateOpen] = useState(false);
  const [facilityId, setFacilityId] = useState(state.currentUser.preferredFacilityId ?? state.facilities[0]!.id);
  const [visitIntent, setVisitIntent] = useState<VisitIntent>('workout');
  const [focus, setFocus] = useState('general_workout');
  const [activity, setActivity] = useState('');
  const [duration, setDuration] = useState('60');
  const [privacy, setPrivacy] = useState<PrivacyLevel>(state.currentUser.defaultPrivacyLevel);
  const [customLateTime, setCustomLateTime] = useState('18:30');
  const recommendations = useMemo(() => recommendFacilities(state, state.now, 'back', undefined, 50), [state]);
  const best = recommendations.find((item) => item.eligible) ?? recommendations[0]!;
  const guidance = useMemo(() => getRecommendationGuidance(best), [best]);
  const bestAggregate = useMemo(() => getLiveAggregate(state, best.facility.id), [best.facility.id, state]);
  const betterWindow = useMemo(
    () => findBetterRecommendationWindow(state, state.now, 'back', undefined, 50, [], best),
    [best, state]
  );
  const promotedWindow = guidance.verdict === 'wait_recommended' ? betterWindow : undefined;
  const planTarget = promotedWindow?.recommendation ?? best;
  const planTime = promotedWindow ? formatTimeInput(promotedWindow.at, state.university.timezone) : undefined;
  const currentFitScore = Math.min(100, Math.max(0, best.score));
  const activityFacilities = activity ? state.facilities.filter((facility) => facility.activities.includes(activity)) : state.facilities;
  const activeVisit = state.visits.find((visit) => visit.userId === state.currentUser.id && visit.status === 'checked_in');
  const upcomingVisit = state.visits.find((visit) => visit.userId === state.currentUser.id && (visit.status === 'planned' || visit.status === 'delayed'));
  const activeFacility = activeVisit ? state.facilities.find((facility) => facility.id === activeVisit.facilityId) : undefined;
  const upcomingFacility = upcomingVisit ? state.facilities.find((facility) => facility.id === upcomingVisit.facilityId) : undefined;
  const firstName = state.currentUser.fullName.split(' ')[0];
  const activeVisitPurpose = activeVisit?.intent === 'activity'
    ? activities.find((item) => item.key === activeVisit.activity)?.label ?? 'Activity'
    : workoutFocuses.find((item) => item.key === activeVisit?.primaryWorkoutFocus)?.label ?? 'Workout';
  const upcomingVisitPurpose = upcomingVisit?.intent === 'activity'
    ? activities.find((item) => item.key === upcomingVisit.activity)?.label ?? 'Activity'
    : workoutFocuses.find((item) => item.key === upcomingVisit?.primaryWorkoutFocus)?.label ?? 'Workout';

  const handleSpontaneous = () => {
    updateTenant(tenant, (current) => spontaneousCheckIn(current, { facilityId, intent: visitIntent, primaryWorkoutFocus: visitIntent === 'workout' ? focus : undefined, activity: activity || undefined, expectedDurationMinutes: Number(duration), privacyLevel: privacy }), 'You’re checked in — live demand has updated');
    setCheckInOpen(false);
  };
  const handleIntentChange = (value: string) => {
    const nextIntent = value as VisitIntent;
    setVisitIntent(nextIntent);
    if (nextIntent === 'activity') {
      const nextActivity = state.facilities.find((facility) => facility.id === facilityId)?.activities[0] ?? activities[0].key;
      setActivity(nextActivity);
    } else {
      setActivity('');
    }
  };
  const handleActivityChange = (nextActivity: string) => {
    setActivity(nextActivity);
    if (visitIntent === 'activity' && nextActivity) {
      const selectedFacilitySupportsActivity = state.facilities.some((facility) => facility.id === facilityId && facility.activities.includes(nextActivity));
      if (!selectedFacilitySupportsActivity) setFacilityId(state.facilities.find((facility) => facility.activities.includes(nextActivity))!.id);
    }
  };
  const handleDelay = (minutes: number) => {
    if (!upcomingVisit) return;
    updateTenant(tenant, (current) => delayVisit(current, upcomingVisit.id, minutes), `Arrival moved ${minutes} minutes — forecasts recalculated`);
    setLateOpen(false);
  };
  const handleCustomDelay = () => {
    if (!upcomingVisit?.plannedArrivalAt) return;
    const next = replaceTime(upcomingVisit.plannedArrivalAt, customLateTime);
    const minutes = Math.max(1, Math.round((Date.parse(next) - Date.parse(upcomingVisit.plannedArrivalAt)) / 60_000));
    handleDelay(minutes);
  };

  return <div className="page-stack home-page">
    <header className="page-header home-header"><div><DataLabel>{state.university.shortName} recreation · Synthetic demo</DataLabel><h1>Good evening, {firstName}.</h1><p>Here’s the clearest read on your workout today.</p></div><Button size="large" onClick={() => setCheckInOpen(true)}><Navigation size={18} /> I’m here</Button></header>

    {activeVisit && activeFacility ? <section className="active-visit-card" aria-labelledby="active-visit-title"><div className="active-visit-pulse"><span /><Dumbbell /></div><div className="active-visit-main"><DataLabel>{activeVisit.intent === 'activity' ? 'Active activity visit' : 'Active workout'}</DataLabel><h2 id="active-visit-title">You’re at {activeFacility.shortName}</h2><p>{activeVisitPurpose} · Expected until {formatTime(activeVisit.expectedEndAt!, state.university.timezone)}</p><div className="active-meta"><span><Timer size={16} /> Started {formatTime(activeVisit.checkedInAt!, state.university.timezone)}</span><span><ShieldCheck size={16} /> {activeVisit.privacyLevel.replace('_', ' ')}</span></div><div className="active-editors">{activeVisit.intent === 'workout' ? <label>Focus<select aria-label="Active workout focus" value={activeVisit.primaryWorkoutFocus} onChange={(event) => updateTenant(tenant, (current) => changeWorkoutFocus(current, activeVisit.id, event.target.value), 'Live workout demand updated')}>{workoutFocuses.map((item) => <option value={item.key} key={item.key}>{item.label}</option>)}</select></label> : null}<label>Activity<select aria-label="Active activity" value={activeVisit.activity ?? ''} onChange={(event) => updateTenant(tenant, (current) => changeActivity(current, activeVisit.id, event.target.value || undefined), 'Live activity demand updated')}>{activeVisit.intent === 'workout' ? <option value="">No activity</option> : null}{activities.filter((item) => activeFacility.activities.includes(item.key)).map((item) => <option value={item.key} key={item.key}>{item.label}</option>)}</select></label></div></div><div className="active-actions"><Button variant="secondary" onClick={() => updateTenant(tenant, (current) => extendVisit(current, activeVisit.id, 20), 'Visit extended by 20 minutes')}>Still here · +20 min</Button><Button onClick={() => updateTenant(tenant, (current) => checkOutVisit(current, activeVisit.id, 'about_as_expected'), 'Checked out — thanks for helping CampusFit')}>I’m done <Check size={17} /></Button></div></section> : null}

    {upcomingVisit && upcomingFacility ? <section className="upcoming-strip"><div className="upcoming-icon"><CalendarClock /></div><div><DataLabel>{upcomingVisit.status === 'delayed' ? 'Updated arrival' : `Upcoming ${upcomingVisit.intent === 'activity' ? 'activity' : 'workout'}`}</DataLabel><h3>{upcomingFacility.shortName} at {formatTime(upcomingVisit.plannedArrivalAt!, state.university.timezone)}</h3><p>{upcomingVisitPurpose} · {upcomingVisit.expectedDurationMinutes} min</p></div><div className="upcoming-actions"><button onClick={() => setLateOpen(true)}>Running late</button><button onClick={() => updateTenant(tenant, (current) => checkInPlannedVisit(current, upcomingVisit.id), 'Plan converted to a live check-in — no double counting')}>I’m here <ArrowRight size={16} /></button></div></section> : null}

    <section className="recommendation-hero">
      <div className="recommendation-copy">
        <span className="kicker"><Sparkles size={14} />{guidance.label}</span>
        <h2>{best.facility.shortName}</h2>
        <div className="recommendation-meta">
          <StatusPill level={best.forecast.crowdLevel} />
          <span><MapPin size={15} />{best.facility.travelMinutes} min away</span>
          <span><Clock3 size={15} />Open now</span>
          <span>{best.forecast.confidence} confidence</span>
        </div>
        <div className="recommendation-live">
          <UsersRound size={19} />
          <div>
            <strong>{bestAggregate.campusFitCheckIns} CampusFit users checked in</strong>
            <small>{bestAggregate.sourceExplanation}</small>
          </div>
        </div>
        <p><strong>{guidance.summary}</strong> {best.explanation} For a back workout, your visit is estimated at <strong>{best.duration.durationRange[0]}–{best.duration.durationRange[1]} minutes</strong>.</p>
        <p className="recommendation-source">Forecast range: {best.forecast.expectedRange[0]}–{best.forecast.expectedRange[1]} expected visits · {best.forecast.confidence} confidence. {best.forecast.sourceExplanation}</p>
        {promotedWindow ? <div className="recommendation-better-window">
          <Clock3 size={18} />
          <div><strong>Better option at {formatTime(promotedWindow.at, state.university.timezone)}</strong><span>{promotedWindow.explanation}</span></div>
        </div> : null}
        <div className="hero-actions">
          <Link className="button button--primary button--medium" to={`/${tenant}/plan?facility=${planTarget.facility.id}&focus=back${planTime ? `&time=${planTime}` : ''}`}>
            {promotedWindow ? `Plan ${planTarget.facility.shortName} at ${formatTime(promotedWindow.at, state.university.timezone)}` : 'Plan this workout'} <ArrowRight size={17} />
          </Link>
          <Link className="button button--ghost button--medium" to={`/${tenant}/facilities`}>Compare gyms</Link>
        </div>
      </div>
      <div className="recommendation-score">
        <span>{guidance.verdict === 'strong_fit' ? 'FIT SCORE' : 'CURRENT FIT'}</span>
        <strong>{currentFitScore}</strong>
        <small>for back at {formatTime(state.now, state.university.timezone)}</small>
        <div className="score-ring" style={{ '--score': `${currentFitScore * 3.6}deg` } as React.CSSProperties} />
      </div>
    </section>

    <section className="today-grid">{betterWindow ? <article className="insight-card"><div className="card-heading"><div><DataLabel>Later today</DataLabel><h2>A better window opens at {formatTime(betterWindow.at, state.university.timezone)}</h2></div><Clock3 /></div><p>{betterWindow.explanation} {betterWindow.minutesSavedRange[1] > 0 ? betterWindow.minutesSavedRange[0] > 0 ? `The estimated visit is ${betterWindow.minutesSavedRange[0]}–${betterWindow.minutesSavedRange[1]} minutes shorter.` : `The estimated visit could be up to ${betterWindow.minutesSavedRange[1]} minutes shorter.` : 'The overall fit improves even though the visit-duration ranges overlap.'}</p><div className="time-compare"><div><small>{formatTime(state.now, state.university.timezone)}</small><strong>{crowdLabel(best.forecast.crowdLevel)}</strong><span className={`bar bar--${best.forecast.crowdLevel}`} /></div><ChevronRight /><div><small>{formatTime(betterWindow.at, state.university.timezone)}</small><strong>{crowdLabel(betterWindow.recommendation.forecast.crowdLevel)}</strong><span className={`bar bar--${betterWindow.recommendation.forecast.crowdLevel}`} /></div></div><p className="forecast-source">Later forecast range: {betterWindow.recommendation.forecast.expectedRange[0]}–{betterWindow.recommendation.forecast.expectedRange[1]} expected visits · {betterWindow.recommendation.forecast.confidence} confidence. {betterWindow.recommendation.forecast.sourceExplanation}</p><Link className="text-link" to={`/${tenant}/plan?facility=${betterWindow.recommendation.facility.id}&time=${formatTimeInput(betterWindow.at, state.university.timezone)}&focus=back`}>Plan {betterWindow.recommendation.facility.shortName} for {formatTime(betterWindow.at, state.university.timezone)} <ArrowRight size={16} /></Link></article> : <article className="insight-card"><div className="card-heading"><div><DataLabel>Later today</DataLabel><h2>No clearly better window found</h2></div><Clock3 /></div><p>CampusFit did not find an open facility in the next three hours that improves the current fit score by at least eight points.</p><Link className="text-link" to={`/${tenant}/plan?focus=back`}>Compare times manually <ArrowRight size={16} /></Link></article>}
      <article className="insight-card"><div className="card-heading"><div><DataLabel>Live CampusFit participation</DataLabel><h2>{state.facilities.reduce((sum, facility) => sum + getLiveAggregate(state, facility.id).campusFitCheckIns, 0)} students checked in</h2></div><UsersRound /></div><p>Voluntary CampusFit check-ins across {state.university.shortName}. This is not official total gym occupancy.</p><div className="focus-tags">{['Back', 'Cardio', 'Legs', 'Full body'].map((label, index) => <span key={label}>{label}<b>{12 - index * 2}</b></span>)}</div><Link className="text-link" to={`/${tenant}/activity`}>Explore demand <ArrowRight size={16} /></Link></article></section>

    <section><div className="section-row"><div><DataLabel>Across NYU</DataLabel><h2>Choose your facility</h2></div><Link className="text-link" to={`/${tenant}/facilities`}>Compare all four <ArrowRight size={16} /></Link></div><div className="facility-grid facility-grid--home">{state.facilities.map((facility) => <FacilityCard key={facility.id} state={state} facility={facility} tenant={tenant} compact />)}</div></section>

    <Modal open={checkInOpen} onClose={() => setCheckInOpen(false)} title="I’m here" description="Manual facility selection works without location access.">
      <div className="form-stack"><div><span className="field-label">What brings you in?</span><SegmentedControl label="Visit purpose" value={visitIntent} onChange={handleIntentChange} options={[{ value: 'workout', label: 'Workout' }, { value: 'activity', label: 'Activity only' }]} /></div>{visitIntent === 'activity' ? <><label>Activity<select value={activity} onChange={(event) => handleActivityChange(event.target.value)}>{activities.filter((item) => state.facilities.some((facility) => facility.activities.includes(item.key))).map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label><label>Facility<select value={facilityId} onChange={(event) => setFacilityId(event.target.value)}>{activityFacilities.map((facility) => <option key={facility.id} value={facility.id}>{facility.shortName}</option>)}</select></label></> : <><label>Facility<select value={facilityId} onChange={(event) => { setFacilityId(event.target.value); setActivity(''); }}>{state.facilities.map((facility) => <option key={facility.id} value={facility.id}>{facility.shortName}</option>)}</select></label><label>Workout focus<select value={focus} onChange={(event) => setFocus(event.target.value)}>{workoutFocuses.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label><label>Activity <span className="optional">Optional</span><select value={activity} onChange={(event) => setActivity(event.target.value)}><option value="">No activity</option>{activities.filter((item) => state.facilities.find((facility) => facility.id === facilityId)?.activities.includes(item.key)).map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label></>}<div><span className="field-label">Expected duration</span><SegmentedControl label="Expected duration" value={duration} onChange={setDuration} options={[{ value: '45', label: '45 min' }, { value: '60', label: '60 min' }, { value: '75', label: '75 min' }]} /></div><label>Privacy<select value={privacy} onChange={(event) => setPrivacy(event.target.value as PrivacyLevel)}><option value="anonymous_aggregate">Anonymous aggregate</option><option value="friends_only">Friends only</option><option value="private">Private</option></select></label><div className="privacy-inline"><ShieldCheck size={17} /><p>Your name and exact visit details are never shown publicly. You still contribute to privacy-protected aggregates.</p></div><Button size="large" disabled={visitIntent === 'activity' && !activity} onClick={handleSpontaneous}>Check in <ArrowRight size={18} /></Button></div>
    </Modal>
    <Modal open={lateOpen} onClose={() => setLateOpen(false)} title="Running late?" description="Your old forecast interval will decrease and the new one will recalculate."><div className="late-options"><button onClick={() => handleDelay(10)}>10 minutes late</button><button onClick={() => handleDelay(20)}>20 minutes late</button><button onClick={() => handleDelay(30)}>30 minutes late</button><label>Choose another time<input type="time" value={customLateTime} onChange={(event) => setCustomLateTime(event.target.value)} /></label><Button onClick={handleCustomDelay}>Update arrival time</Button></div></Modal>
  </div>;
}
