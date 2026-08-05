import { ArrowRight, CalendarClock, CalendarPlus, Check, CheckCircle2, ChevronRight, Clock3, Dumbbell, GitCompareArrows, MapPin, Navigation, ShieldCheck, Sparkles, UsersRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FacilityCard } from '../components/FacilityCard';
import { WorkoutFocusPicker } from '../components/WorkoutFocusPicker';
import { VisitPrivacyPicker } from '../components/VisitPrivacyPicker';
import { Button, DataLabel, DataSourceLabel, Modal, QuickAction, SectionHeader, SegmentedControl, StatusPill } from '../components/ui';
import { useCampusFit } from '../data/CampusFitContext';
import { useTenant } from '../data/TenantContext';
import { activities, workoutFocuses } from '../data/catalog';
import type { PrivacyLevel, VisitIntent } from '../domain/types';
import { crowdLabel, formatTime, formatTimeInput, replaceTime } from '../lib/format';
import { getLiveAggregate } from '../services/liveAggregation';
import { findBetterRecommendationWindow, getRecommendationGuidance, recommendFacilities } from '../services/recommendation';
import { forecastDemand } from '../services/forecasting';
import { changeActivity, changeWorkoutFocuses, checkInPlannedVisit, checkOutVisit, delayVisit, extendVisit, extendVisitUntil, spontaneousCheckIn } from '../services/visitLifecycle';
import { getActiveVisitTiming, graceMinutesRemaining } from '../services/visitReminders';
import { getVisitWorkoutFocuses } from '../services/workoutFocus';

const workoutFocusLabel = (focuses: string[]): string =>
  focuses.map((key) => workoutFocuses.find((item) => item.key === key)?.label).filter(Boolean).join(' + ') || 'Workout';

const toLocalDateTimeInput = (iso: string): string => {
  const date = new Date(iso);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
};

export function HomePage() {
  const { tenant, state } = useTenant();
  const { updateTenant } = useCampusFit();
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkInStep, setCheckInStep] = useState(0);
  const [lateOpen, setLateOpen] = useState(false);
  const [facilityId, setFacilityId] = useState(state.currentUser.preferredFacilityId ?? state.facilities[0]!.id);
  const [visitIntent, setVisitIntent] = useState<VisitIntent>('workout');
  const [selectedFocuses, setSelectedFocuses] = useState<string[]>(['general_workout']);
  const [activity, setActivity] = useState('');
  const [duration, setDuration] = useState('60');
  const [privacy, setPrivacy] = useState<PrivacyLevel>(state.currentUser.defaultPrivacyLevel);
  const [customLateTime, setCustomLateTime] = useState('18:30');
  const [extensionEnd, setExtensionEnd] = useState('');
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
  const activeVisit = state.visits.find((visit) => visit.userId === state.currentUser.id && visit.status === 'checked_in');
  const upcomingVisit = state.visits.find((visit) => visit.userId === state.currentUser.id && (visit.status === 'planned' || visit.status === 'delayed'));
  const activeFacility = activeVisit ? state.facilities.find((facility) => facility.id === activeVisit.facilityId) : undefined;
  const upcomingFacility = upcomingVisit ? state.facilities.find((facility) => facility.id === upcomingVisit.facilityId) : undefined;
  const firstName = state.currentUser.fullName.split(' ')[0];
  const activeVisitPurpose = activeVisit?.intent === 'activity'
    ? activities.find((item) => item.key === activeVisit.activity)?.label ?? 'Activity'
    : activeVisit ? workoutFocusLabel(getVisitWorkoutFocuses(activeVisit)) : 'Workout';
  const upcomingVisitPurpose = upcomingVisit?.intent === 'activity'
    ? activities.find((item) => item.key === upcomingVisit.activity)?.label ?? 'Activity'
    : upcomingVisit ? workoutFocusLabel(getVisitWorkoutFocuses(upcomingVisit)) : 'Workout';
  const localHour = new Date(state.now).getHours();
  const greeting = localHour < 12 ? 'Good morning' : localHour < 17 ? 'Good afternoon' : 'Good evening';
  const activeElapsed = activeVisit?.checkedInAt ? Math.max(0, Math.round((Date.parse(state.now) - Date.parse(activeVisit.checkedInAt)) / 60_000)) : 0;
  const activeTiming = activeVisit ? getActiveVisitTiming(activeVisit, state.now) : 'on_time';
  const extensionValue = extensionEnd || (activeVisit?.expectedEndAt ? toLocalDateTimeInput(activeVisit.expectedEndAt) : '');

  const openCheckIn = () => {
    setCheckInStep(0);
    setCheckInOpen(true);
  };
  const closeCheckIn = () => {
    setCheckInOpen(false);
    setCheckInStep(0);
  };

  const handleSpontaneous = () => {
    updateTenant(tenant, (current) => spontaneousCheckIn(current, { facilityId, intent: visitIntent, workoutFocuses: visitIntent === 'workout' ? selectedFocuses : [], activity: activity || undefined, expectedDurationMinutes: Number(duration), privacyLevel: privacy }), 'You’re checked in — live demand has updated');
    setCheckInStep(4);
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
  const handleExtension = () => {
    if (!activeVisit || !extensionValue) return;
    const expectedEndAt = new Date(extensionValue).toISOString();
    updateTenant(tenant, (current) => extendVisitUntil(current, activeVisit.id, expectedEndAt), `Visit extended until ${formatTime(expectedEndAt, state.university.timezone)}`);
    setExtensionEnd('');
  };

  return <div className="page-stack home-page">
    <header className="page-header home-header"><div><DataLabel>{state.university.shortName} recreation</DataLabel><h1>{greeting}, {firstName}</h1><p>Here’s the best move for your workout today.</p></div><Button size="large" onClick={openCheckIn} disabled={Boolean(activeVisit)}><Navigation size={18} /> {activeVisit ? 'Checked in' : 'I’m here'}</Button></header>

    <section className="recommendation-hero">
      <div className="recommendation-copy">
        <div className="recommendation-topline">
          <DataLabel>Best move right now</DataLabel>
          <span className="kicker recommendation-guidance"><Sparkles size={14} />{guidance.label}</span>
        </div>
        <h2>{best.facility.shortName}</h2>
        <div className="recommendation-meta">
          <StatusPill level={best.forecast.crowdLevel} />
          <span><MapPin size={15} />{best.facility.travelMinutes} min away</span>
          <span><Clock3 size={15} />Open now</span>
        </div>
        <p className="recommendation-summary">{guidance.summary}</p>
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
        <div className="recommendation-highlights">
          <div>
            <span className="recommendation-highlight-icon"><Clock3 size={19} /></span>
            <span><small>Estimated visit</small><strong>{best.duration.durationRange[0]}–{best.duration.durationRange[1]} minutes</strong></span>
          </div>
          <div>
            <span className="recommendation-highlight-icon"><UsersRound size={19} /></span>
            <span><small>Live CampusFit activity</small><strong>{bestAggregate.campusFitCheckIns} CampusFit users checked in</strong></span>
          </div>
        </div>
        <p className="recommendation-reason">{best.explanation}</p>
        <details className="recommendation-details">
          <summary>How CampusFit calculated this</summary>
          <div>
            <DataSourceLabel>CampusFit prediction · {best.forecast.expectedRange[0]}–{best.forecast.expectedRange[1]} range · {best.forecast.confidence} confidence</DataSourceLabel>
            <p>{best.forecast.sourceExplanation}</p>
            <p><strong>Live check-ins:</strong> {bestAggregate.sourceExplanation}</p>
          </div>
        </details>
      </div>
    </section>

    <section className="quick-actions-section" aria-labelledby="quick-actions-title"><SectionHeader eyebrow="Your next step" title="What do you want to do?" /><h2 id="quick-actions-title" className="sr-only">Quick actions</h2><div className="quick-action-grid"><QuickAction icon={<Navigation />} label={activeVisit ? 'View active visit' : 'I’m here'} note={activeVisit ? `${activeElapsed} min in progress` : 'Check in anonymously'} onClick={activeVisit ? () => document.querySelector('.active-visit-card')?.scrollIntoView({ behavior: 'smooth' }) : openCheckIn} /><QuickAction icon={<CalendarPlus />} label="Plan workout" note="Choose time and focus" to={`/${tenant}/plan`} /><QuickAction icon={<GitCompareArrows />} label="Compare gyms" note="Ranked for your workout" to={`/${tenant}/facilities`} /></div></section>

    {activeVisit && activeFacility ? <section className="active-visit-card" aria-labelledby="active-visit-title"><div className="active-visit-pulse"><span /><Dumbbell /></div><div className="active-visit-main"><DataLabel>{activeVisit.intent === 'activity' ? 'Active activity visit' : 'Active workout'}</DataLabel><h2 id="active-visit-title">You’re at {activeFacility.shortName}</h2><div className="active-timer"><strong>{activeElapsed}<small>min</small></strong><span>Expected finish<br /><b>{formatTime(activeVisit.expectedEndAt!, state.university.timezone)}</b></span></div><p>{activeVisitPurpose} · Started {formatTime(activeVisit.checkedInAt!, state.university.timezone)}</p><div className="active-meta"><span><ShieldCheck size={16} /> Contributing anonymously</span></div><div className="active-editors">{activeVisit.intent === 'workout' ? <WorkoutFocusPicker compact legend="Update muscle groups" description="Your live demand contribution updates when these change." selected={getVisitWorkoutFocuses(activeVisit)} onChange={(focuses) => updateTenant(tenant, (current) => changeWorkoutFocuses(current, activeVisit.id, focuses), 'Live workout demand updated')} /> : null}<label>Change activity<select aria-label="Active activity" value={activeVisit.activity ?? ''} onChange={(event) => updateTenant(tenant, (current) => changeActivity(current, activeVisit.id, event.target.value || undefined), 'Live activity demand updated')}>{activeVisit.intent === 'workout' ? <option value="">No activity</option> : null}{activities.filter((item) => activeFacility.activities.includes(item.key)).map((item) => <option value={item.key} key={item.key}>{item.label}</option>)}</select></label></div></div><div className="active-actions"><Button variant="secondary" onClick={() => updateTenant(tenant, (current) => extendVisit(current, activeVisit.id, 20), 'Visit extended by 20 minutes')}>Extend 20 min</Button><Button onClick={() => updateTenant(tenant, (current) => checkOutVisit(current, activeVisit.id, 'about_as_expected'), 'Checked out — thanks for helping CampusFit')}>Wrap up workout <Check size={17} /></Button></div></section> : null}

    {activeVisit ? <section className={`visit-extension-panel${activeTiming === 'grace_period' ? ' is-overdue' : ''}`} aria-labelledby="visit-extension-title"><div><Clock3 /><div><h2 id="visit-extension-title">{activeTiming === 'grace_period' ? 'Are you finished?' : 'Need more time?'}</h2><p>{activeTiming === 'grace_period' ? `Your clock is still running. Extend it or check out within ${graceMinutesRemaining(activeVisit, state.now)} minutes to avoid automatic checkout.` : 'Set the exact time you expect to finish. There is no fixed 20-minute limit.'}</p></div></div><label>New finish time<input type="datetime-local" min={toLocalDateTimeInput(state.now)} value={extensionValue} onChange={(event) => setExtensionEnd(event.target.value)} /></label><div><Button variant="secondary" onClick={handleExtension}>Extend until this time</Button>{activeTiming === 'grace_period' ? <Button onClick={() => updateTenant(tenant, (current) => checkOutVisit(current, activeVisit.id, 'about_as_expected'), 'Checked out — thanks for helping CampusFit')}>I’m done <Check size={17} /></Button> : null}</div></section> : null}

    {upcomingVisit && upcomingFacility ? <section className="upcoming-strip"><div className="upcoming-icon"><CalendarClock /></div><div><DataLabel>{upcomingVisit.status === 'delayed' ? 'Updated arrival' : `Upcoming ${upcomingVisit.intent === 'activity' ? 'activity' : 'workout'}`}</DataLabel><h3>{upcomingFacility.shortName} at {formatTime(upcomingVisit.plannedArrivalAt!, state.university.timezone)}</h3><p>{upcomingVisitPurpose} · {upcomingVisit.expectedDurationMinutes} min · {crowdLabel(forecastDemand(state, upcomingFacility.id, upcomingVisit.plannedArrivalAt!).crowdLevel)} expected</p></div><div className="upcoming-actions"><button onClick={() => setLateOpen(true)}>Running late?</button><button onClick={() => updateTenant(tenant, (current) => checkInPlannedVisit(current, upcomingVisit.id), 'Plan converted to a live check-in — no double counting')}>I’m here <ArrowRight size={16} /></button></div></section> : null}

    <section className="today-grid">{betterWindow ? <article className="insight-card"><div className="card-heading"><div><DataLabel>Later today</DataLabel><h2>A better window opens at {formatTime(betterWindow.at, state.university.timezone)}</h2></div><Clock3 /></div><p>{betterWindow.explanation} {betterWindow.minutesSavedRange[1] > 0 ? betterWindow.minutesSavedRange[0] > 0 ? `The estimated visit is ${betterWindow.minutesSavedRange[0]}–${betterWindow.minutesSavedRange[1]} minutes shorter.` : `The estimated visit could be up to ${betterWindow.minutesSavedRange[1]} minutes shorter.` : 'The overall fit improves even though the visit-duration ranges overlap.'}</p><div className="time-compare"><div><small>{formatTime(state.now, state.university.timezone)}</small><strong>{crowdLabel(best.forecast.crowdLevel)}</strong><span className={`bar bar--${best.forecast.crowdLevel}`} /></div><ChevronRight /><div><small>{formatTime(betterWindow.at, state.university.timezone)}</small><strong>{crowdLabel(betterWindow.recommendation.forecast.crowdLevel)}</strong><span className={`bar bar--${betterWindow.recommendation.forecast.crowdLevel}`} /></div></div><p className="forecast-source">Later forecast range: {betterWindow.recommendation.forecast.expectedRange[0]}–{betterWindow.recommendation.forecast.expectedRange[1]} expected visits · {betterWindow.recommendation.forecast.confidence} confidence. {betterWindow.recommendation.forecast.sourceExplanation}</p><Link className="text-link" to={`/${tenant}/plan?facility=${betterWindow.recommendation.facility.id}&time=${formatTimeInput(betterWindow.at, state.university.timezone)}&focus=back`}>Plan {betterWindow.recommendation.facility.shortName} for {formatTime(betterWindow.at, state.university.timezone)} <ArrowRight size={16} /></Link></article> : <article className="insight-card"><div className="card-heading"><div><DataLabel>Later today</DataLabel><h2>No clearly better window found</h2></div><Clock3 /></div><p>CampusFit did not find an open facility in the next three hours that improves the current fit score by at least eight points.</p><Link className="text-link" to={`/${tenant}/plan?focus=back`}>Compare times manually <ArrowRight size={16} /></Link></article>}
      <article className="insight-card"><div className="card-heading"><div><DataLabel>Live CampusFit participation</DataLabel><h2>{state.facilities.reduce((sum, facility) => sum + getLiveAggregate(state, facility.id).campusFitCheckIns, 0)} students checked in</h2></div><UsersRound /></div><p>Voluntary CampusFit check-ins across {state.university.shortName}. This is not official total gym occupancy.</p><div className="focus-tags">{['Back', 'Cardio', 'Legs', 'Full body'].map((label, index) => <span key={label}>{label}<b>{12 - index * 2}</b></span>)}</div><Link className="text-link" to={`/${tenant}/activity`}>Explore demand <ArrowRight size={16} /></Link></article></section>

    <section><div className="section-row"><div><DataLabel>Across NYU</DataLabel><h2>Choose your facility</h2></div><Link className="text-link" to={`/${tenant}/facilities`}>Compare all four <ArrowRight size={16} /></Link></div><div className="facility-grid facility-grid--home">{state.facilities.map((facility) => <FacilityCard key={facility.id} state={state} facility={facility} tenant={tenant} compact />)}</div></section>

    <Modal open={checkInOpen} onClose={closeCheckIn} title={checkInStep === 4 ? 'You’re checked in' : 'I’m here'} description={checkInStep === 4 ? undefined : 'Manual facility selection works without location access.'} label={checkInStep === 4 ? 'Visit started' : `Quick check-in · ${Math.min(checkInStep + 1, 4)} of 4`}>
      {checkInStep === 0 ? <div className="checkin-step"><h3>Which NYU gym are you at?</h3><div className="sheet-choice-list">{state.facilities.map((facility) => <button type="button" key={facility.id} className={facilityId === facility.id ? 'is-selected' : ''} onClick={() => { setFacilityId(facility.id); setActivity(''); }}><span>{facility.shortName.slice(0, 2).toUpperCase()}</span><strong>{facility.shortName}<small>{facility.address}</small></strong>{facilityId === facility.id ? <Check /> : null}</button>)}</div><Button size="large" onClick={() => setCheckInStep(1)}>Continue <ArrowRight /></Button></div> : null}
      {checkInStep === 1 ? <div className="checkin-step"><h3>What are you here for?</h3><SegmentedControl label="Visit purpose" value={visitIntent} onChange={handleIntentChange} options={[{ value: 'workout', label: 'Workout' }, { value: 'activity', label: 'Activity only' }]} />{visitIntent === 'activity' ? <label>Activity<select value={activity} onChange={(event) => handleActivityChange(event.target.value)}>{activities.filter((item) => state.facilities.some((facility) => facility.activities.includes(item.key))).map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label> : <WorkoutFocusPicker compact selected={selectedFocuses} onChange={setSelectedFocuses} description="Choose all the muscle groups you’re training today." />}<div className="sheet-step-actions"><Button variant="ghost" onClick={() => setCheckInStep(0)}>Back</Button><Button disabled={visitIntent === 'activity' ? !activity : selectedFocuses.length === 0} onClick={() => setCheckInStep(2)}>Continue <ArrowRight /></Button></div></div> : null}
      {checkInStep === 2 ? <div className="checkin-step"><h3>How long will you be here?</h3><SegmentedControl label="Expected duration" value={duration} onChange={setDuration} options={[{ value: '45', label: '45 min' }, { value: '60', label: '60 min' }, { value: '75', label: '75 min' }]} /><p className="sheet-helper">We’ll remind you near your expected finish and automatically close stale visits after the NYU grace period.</p><div className="sheet-step-actions"><Button variant="ghost" onClick={() => setCheckInStep(1)}>Back</Button><Button onClick={() => setCheckInStep(3)}>Review <ArrowRight /></Button></div></div> : null}
      {checkInStep === 3 ? <div className="checkin-step checkin-review"><h3>Ready to check in?</h3><div className="checkin-review-card"><span>{state.facilities.find((facility) => facility.id === facilityId)?.shortName}</span><strong>{visitIntent === 'activity' ? activities.find((item) => item.key === activity)?.label : workoutFocusLabel(selectedFocuses)}</strong><small>{duration} minutes · CampusFit aggregate</small></div><label>Privacy<select value={privacy} onChange={(event) => setPrivacy(event.target.value as PrivacyLevel)}><option value="anonymous_aggregate">Anonymous aggregate</option><option value="friends_only">Friends only</option><option value="private">Private</option></select></label><div className="privacy-inline"><ShieldCheck /><p>Your name and exact visit details are never shown publicly.</p></div><div className="sheet-step-actions"><Button variant="ghost" onClick={() => setCheckInStep(2)}>Back</Button><Button size="large" onClick={handleSpontaneous}>{privacy === 'anonymous_aggregate' ? 'Check in anonymously' : 'Check in'} <ArrowRight /></Button></div></div> : null}
      {checkInStep === 3 ? <VisitPrivacyPicker /> : null}
      {checkInStep === 4 ? <div className="checkin-confirmation" role="status"><span><CheckCircle2 /></span><h3>You’re checked in at {state.facilities.find((facility) => facility.id === facilityId)?.shortName}.</h3><p>Your visit is contributing anonymously to approximate gym and workout-area demand.</p><Button size="large" onClick={closeCheckIn}>View active visit</Button></div> : null}
    </Modal>
    <Modal open={lateOpen} onClose={() => setLateOpen(false)} title="Running late?" description="Your old forecast interval will decrease and the new one will recalculate."><div className="late-options"><button onClick={() => handleDelay(10)}>10 minutes late</button><button onClick={() => handleDelay(20)}>20 minutes late</button><button onClick={() => handleDelay(30)}>30 minutes late</button><label>Choose another time<input type="time" value={customLateTime} onChange={(event) => setCustomLateTime(event.target.value)} /></label><Button onClick={handleCustomDelay}>Update arrival time</Button></div></Modal>
  </div>;
}
