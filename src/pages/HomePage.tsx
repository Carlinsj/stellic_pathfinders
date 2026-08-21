import { ArrowRight, Building2, CalendarClock, CalendarPlus, CalendarX2, Check, CheckCircle2, ChevronRight, Clock3, Dumbbell, GitCompareArrows, Navigation, ShieldCheck, UsersRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import { FacilityCard } from '../components/FacilityCard';
import { ParticipationTracker } from '../components/ParticipationTracker';
import { WorkoutFocusPicker } from '../components/WorkoutFocusPicker';
import { VisitPrivacyPicker } from '../components/VisitPrivacyPicker';
import { Button, DataLabel, Modal, QuickAction, SectionHeader, SegmentedControl } from '../components/ui';
import { useCampusFit } from '../data/CampusFitContext';
import { useTenant } from '../data/TenantContext';
import { activities, workoutFocuses } from '../data/catalog';
import type { VisitIntent } from '../domain/types';
import { crowdLabel, formatDate, formatTime } from '../lib/format';
import { getLiveAggregate } from '../services/liveAggregation';
import { getFacilityParticipationTracker } from '../services/participationTracker';
import { forecastDemand, isFacilityOpen } from '../services/forecasting';
import { cancelVisit, changeActivity, changeWorkoutFocuses, checkInPlannedVisit, checkOutVisit, delayVisit, extendVisitUntil, rescheduleVisit, spontaneousCheckIn } from '../services/visitLifecycle';
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
  const [managePlanOpen, setManagePlanOpen] = useState(false);
  const [managePlanView, setManagePlanView] = useState<'reschedule' | 'cancel'>('reschedule');
  const [facilityId, setFacilityId] = useState(state.currentUser.preferredFacilityId ?? state.facilities[0]!.id);
  const [visitIntent, setVisitIntent] = useState<VisitIntent>('workout');
  const [selectedFocuses, setSelectedFocuses] = useState<string[]>(['general_workout']);
  const [activity, setActivity] = useState('');
  const [duration, setDuration] = useState('60');
  const [rescheduledArrival, setRescheduledArrival] = useState('');
  const [extensionEnd, setExtensionEnd] = useState('');
  const activeVisit = state.visits.find((visit) => visit.userId === state.currentUser.id && visit.status === 'checked_in');
  const upcomingVisit = state.visits.find((visit) => visit.userId === state.currentUser.id && (visit.status === 'planned' || visit.status === 'delayed'));
  const activeFacility = activeVisit ? state.facilities.find((facility) => facility.id === activeVisit.facilityId) : undefined;
  const upcomingFacility = upcomingVisit ? state.facilities.find((facility) => facility.id === upcomingVisit.facilityId) : undefined;
  const upcomingParticipation = useMemo(() => upcomingVisit?.plannedArrivalAt
    ? getFacilityParticipationTracker(state, upcomingVisit.facilityId, upcomingVisit.plannedArrivalAt)
    : undefined, [state, upcomingVisit]);
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
  const openFacilityCount = state.facilities.filter((facility) => isFacilityOpen(facility, state.now)).length;
  const campusFitCheckIns = state.facilities.reduce((sum, facility) => sum + getLiveAggregate(state, facility.id).campusFitCheckIns, 0);

  const openCheckIn = () => {
    setCheckInStep(0);
    setCheckInOpen(true);
  };
  const closeCheckIn = () => {
    setCheckInOpen(false);
    setCheckInStep(0);
  };

  const handleSpontaneous = () => {
    updateTenant(tenant, (current) => spontaneousCheckIn(current, { facilityId, intent: visitIntent, workoutFocuses: visitIntent === 'workout' ? selectedFocuses : [], activity: activity || undefined, expectedDurationMinutes: Number(duration), privacyLevel: 'anonymous_aggregate' }), 'You’re checked in — live demand has updated');
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
  const openPlanManager = () => {
    if (!upcomingVisit?.plannedArrivalAt) return;
    setRescheduledArrival(toLocalDateTimeInput(upcomingVisit.plannedArrivalAt));
    setManagePlanView('reschedule');
    setManagePlanOpen(true);
  };
  const closePlanManager = () => {
    setManagePlanOpen(false);
    setManagePlanView('reschedule');
  };
  const handleReschedule = () => {
    if (!upcomingVisit || !rescheduledArrival) return;
    const plannedArrivalAt = new Date(rescheduledArrival).toISOString();
    updateTenant(tenant, (current) => rescheduleVisit(current, upcomingVisit.id, plannedArrivalAt), `${upcomingVisit.intent === 'activity' ? 'Activity' : 'Workout'} rescheduled for ${formatDate(plannedArrivalAt, state.university.timezone)} at ${formatTime(plannedArrivalAt, state.university.timezone)}`);
    closePlanManager();
  };
  const handleCancelPlan = () => {
    if (!upcomingVisit) return;
    updateTenant(tenant, (current) => cancelVisit(current, upcomingVisit.id), `${upcomingVisit.intent === 'activity' ? 'Activity' : 'Workout'} cancelled`);
    closePlanManager();
  };
  const handleDelay = (minutes: number) => {
    if (!upcomingVisit) return;
    updateTenant(
      tenant,
      (current) => delayVisit(current, upcomingVisit.id, minutes),
      `Arrival moved ${minutes} minutes — forecasts recalculated`,
    );
    setLateOpen(false);
  };
  const handleExtension = () => {
    if (!activeVisit || !extensionValue) return;
    const expectedEndAt = new Date(extensionValue).toISOString();
    updateTenant(tenant, (current) => extendVisitUntil(current, activeVisit.id, expectedEndAt), `Visit extended until ${formatTime(expectedEndAt, state.university.timezone)}`);
    setExtensionEnd('');
  };
  const proposedArrivalAt = rescheduledArrival ? Date.parse(rescheduledArrival) : Number.NaN;
  const currentArrivalAt = upcomingVisit?.plannedArrivalAt ? Date.parse(upcomingVisit.plannedArrivalAt) : Number.NaN;
  const canSaveReschedule = Number.isFinite(proposedArrivalAt) && proposedArrivalAt > Date.parse(state.now) && proposedArrivalAt !== currentArrivalAt;
  const upcomingVisitType = upcomingVisit?.intent === 'activity' ? 'activity' : 'workout';

  const activeVisitExperience = activeVisit && activeFacility ? <>
    <section className="active-visit-card" aria-labelledby="active-visit-title">
      <div className="active-visit-card__top">
        <div className="active-visit-pulse" aria-hidden="true"><span /><Dumbbell /></div>
        <div className="active-visit-card__identity"><DataLabel>{activeVisit.intent === 'activity' ? 'Active activity visit' : 'Active workout'}</DataLabel><h2 id="active-visit-title">You’re at {activeFacility.shortName}</h2></div>
        <div className="active-actions"><Button onClick={() => updateTenant(tenant, (current) => checkOutVisit(current, activeVisit.id, 'about_as_expected'), 'Checked out — thanks for helping CampusFit')}>Wrap up workout <Check size={17} /></Button></div>
      </div>
      <div className="active-visit-main">
        <div className="active-visit-summary">
          <div className="active-timer"><strong>{activeElapsed}<small>min</small></strong><span>Expected finish<br /><b>{formatTime(activeVisit.expectedEndAt!, state.university.timezone)}</b></span></div>
          <p>{activeVisitPurpose} · Started {formatTime(activeVisit.checkedInAt!, state.university.timezone)}</p>
          <div className="active-meta"><span><ShieldCheck size={16} /> Contributing anonymously</span></div>
        </div>
        <div className="active-editors">{activeVisit.intent === 'workout' ? <WorkoutFocusPicker compact legend="Update muscle groups" description="Your live demand contribution updates when these change." selected={getVisitWorkoutFocuses(activeVisit)} onChange={(focuses) => updateTenant(tenant, (current) => changeWorkoutFocuses(current, activeVisit.id, focuses), 'Live workout demand updated')} /> : null}<label>Change activity<select aria-label="Active activity" value={activeVisit.activity ?? ''} onChange={(event) => updateTenant(tenant, (current) => changeActivity(current, activeVisit.id, event.target.value || undefined), 'Live activity demand updated')}>{activeVisit.intent === 'workout' ? <option value="">No activity</option> : null}{activities.filter((item) => activeFacility.activities.includes(item.key)).map((item) => <option value={item.key} key={item.key}>{item.label}</option>)}</select></label></div>
      </div>
    </section>
    <section className={`visit-extension-panel${activeTiming === 'grace_period' ? ' is-overdue' : ''}`} aria-labelledby="visit-extension-title"><div><Clock3 /><div><h2 id="visit-extension-title">{activeTiming === 'grace_period' ? 'Are you finished?' : 'Need more time?'}</h2><p>{activeTiming === 'grace_period' ? `Your clock is still running. Extend it or check out within ${graceMinutesRemaining(activeVisit, state.now)} minutes to avoid automatic checkout.` : 'Set the exact time you expect to finish. There is no fixed 20-minute limit.'}</p></div></div><label>New finish time<input type="datetime-local" min={toLocalDateTimeInput(state.now)} value={extensionValue} onChange={(event) => setExtensionEnd(event.target.value)} /></label><div><Button variant="secondary" onClick={handleExtension}>Extend until this time</Button>{activeTiming === 'grace_period' ? <Button onClick={() => updateTenant(tenant, (current) => checkOutVisit(current, activeVisit.id, 'about_as_expected'), 'Checked out — thanks for helping CampusFit')}>I’m done <Check size={17} /></Button> : null}</div></section>
  </> : null;

  return <div className="page-stack home-page">
    <header className="page-header home-header"><div><DataLabel>{state.university.shortName} recreation</DataLabel><h1>{greeting}, {firstName}</h1><p>See voluntary CampusFit check-ins across every gym, then choose what fits your plans.</p></div><button type="button" className={`home-checkin-control${activeVisit ? ' is-locked' : ''}`} onClick={openCheckIn} disabled={Boolean(activeVisit)} aria-label={activeVisit ? 'Checked in — check-in locked until checkout' : 'Check in'}>{activeVisit ? 'Checked in · locked' : 'Check in'}</button></header>

    {activeVisitExperience}

    <section className="student-overview" aria-label="Your CampusFit overview">
      <article><span><Building2 aria-hidden="true" /></span><div><strong>{openFacilityCount} of {state.facilities.length}</strong><small>facilities open now</small></div></article>
      <article aria-live="polite" aria-atomic="true"><span><UsersRound aria-hidden="true" /></span><div><strong>{campusFitCheckIns}</strong><small>{campusFitCheckIns === 1 ? 'person currently checked in' : 'people currently checked in'}</small></div></article>
      <article><span><CalendarClock aria-hidden="true" /></span><div><strong>{activeVisit ? `${activeElapsed} min` : upcomingVisit ? formatTime(upcomingVisit.plannedArrivalAt!, state.university.timezone) : state.facilities.length}</strong><small>{activeVisit ? 'active visit' : upcomingVisit ? `next at ${upcomingFacility?.shortName ?? 'your facility'}` : 'gym check-in trackers'}</small></div></article>
    </section>

    <section className="home-live-section" aria-labelledby="home-live-title">
      <SectionHeader eyebrow="Live CampusFit check-ins" title="Every NYU gym, without guessing your workout" titleId="home-live-title" description="Counts are anonymous, voluntary CampusFit check-ins—not official occupancy. Open a gym to see privacy-protected activity details, facility resources, and planning options." />
      <div className="facility-grid facility-grid--home" aria-label="Anonymous CampusFit check-ins by gym">{state.facilities.map((facility) => <FacilityCard key={facility.id} state={state} facility={facility} tenant={tenant} compact />)}</div>
    </section>

    <section className="quick-actions-section" aria-labelledby="quick-actions-title"><SectionHeader eyebrow="Your next step" title="What do you want to do?" titleId="quick-actions-title" /><div className="quick-action-grid"><QuickAction icon={<Navigation />} label={activeVisit ? 'View active visit' : 'I’m here'} note={activeVisit ? `${activeElapsed} min in progress` : 'Check in anonymously'} onClick={activeVisit ? () => document.querySelector('.active-visit-card')?.scrollIntoView({ behavior: 'smooth' }) : openCheckIn} /><QuickAction icon={<CalendarPlus />} label="Plan workout" note="Choose time and focus" to={`/${tenant}/plan`} /><QuickAction icon={<GitCompareArrows />} label="Compare gyms" note="Ranked for your workout" to={`/${tenant}/facilities`} /></div></section>

    {upcomingVisit && upcomingFacility ? <section className="upcoming-strip"><div className="upcoming-icon"><CalendarClock /></div><div><DataLabel>{upcomingVisit.status === 'delayed' ? 'Updated arrival' : `Upcoming ${upcomingVisit.intent === 'activity' ? 'activity' : 'workout'}`}</DataLabel><h3>{upcomingFacility.shortName} at {formatTime(upcomingVisit.plannedArrivalAt!, state.university.timezone)}</h3><p>{upcomingVisitPurpose} · {upcomingVisit.expectedDurationMinutes} min · {crowdLabel(forecastDemand(state, upcomingFacility.id, upcomingVisit.plannedArrivalAt!).crowdLevel)} expected</p></div><div className="upcoming-actions"><button onClick={openPlanManager}>Manage plan</button><button onClick={() => setLateOpen(true)}>Running late?</button><button onClick={() => updateTenant(tenant, (current) => checkInPlannedVisit(current, upcomingVisit.id), 'Plan converted to a live check-in — no double counting')}>I’m here <ArrowRight size={16} /></button></div></section> : null}

    {upcomingParticipation && upcomingFacility ? <ParticipationTracker tracker={upcomingParticipation} facilityName={upcomingFacility.shortName} timezone={state.university.timezone} planning /> : null}

    <Modal open={checkInOpen} onClose={closeCheckIn} title={checkInStep === 4 ? 'You’re checked in' : 'I’m here'} description={checkInStep === 4 ? undefined : 'Manual facility selection works without location access.'} label={checkInStep === 4 ? 'Visit started' : `Quick check-in · ${Math.min(checkInStep + 1, 4)} of 4`}>
      {checkInStep === 0 ? <div className="checkin-step"><h3>Which NYU gym are you at?</h3><div className="sheet-choice-list">{state.facilities.map((facility) => <button type="button" key={facility.id} className={facilityId === facility.id ? 'is-selected' : ''} onClick={() => { setFacilityId(facility.id); setActivity(''); }}><span>{facility.shortName.slice(0, 2).toUpperCase()}</span><strong>{facility.shortName}<small>{facility.address}</small></strong>{facilityId === facility.id ? <Check /> : null}</button>)}</div><Button size="large" onClick={() => setCheckInStep(1)}>Continue <ArrowRight /></Button></div> : null}
      {checkInStep === 1 ? <div className="checkin-step"><h3>What are you here for?</h3><SegmentedControl label="Visit purpose" value={visitIntent} onChange={handleIntentChange} options={[{ value: 'workout', label: 'Workout' }, { value: 'activity', label: 'Activity only' }]} />{visitIntent === 'activity' ? <label>Activity<select value={activity} onChange={(event) => handleActivityChange(event.target.value)}>{activities.filter((item) => state.facilities.some((facility) => facility.activities.includes(item.key))).map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label> : <WorkoutFocusPicker compact selected={selectedFocuses} onChange={setSelectedFocuses} description="Choose all the muscle groups you’re training today." />}<div className="sheet-step-actions"><Button variant="ghost" onClick={() => setCheckInStep(0)}>Back</Button><Button disabled={visitIntent === 'activity' ? !activity : selectedFocuses.length === 0} onClick={() => setCheckInStep(2)}>Continue <ArrowRight /></Button></div></div> : null}
      {checkInStep === 2 ? <div className="checkin-step"><h3>How long will you be here?</h3><SegmentedControl label="Expected duration" value={duration} onChange={setDuration} options={[{ value: '45', label: '45 min' }, { value: '60', label: '60 min' }, { value: '75', label: '75 min' }]} /><p className="sheet-helper">We’ll remind you near your expected finish and automatically close stale visits after the NYU grace period.</p><div className="sheet-step-actions"><Button variant="ghost" onClick={() => setCheckInStep(1)}>Back</Button><Button onClick={() => setCheckInStep(3)}>Review <ArrowRight /></Button></div></div> : null}
      {checkInStep === 3 ? <div className="checkin-step checkin-review-simple"><h3>Ready to check in?</h3><div className="checkin-review-card"><span>{state.facilities.find((facility) => facility.id === facilityId)?.shortName}</span><strong>{visitIntent === 'activity' ? activities.find((item) => item.key === activity)?.label : workoutFocusLabel(selectedFocuses)}</strong><small>{duration} minutes</small></div><div className="sheet-step-actions"><Button variant="ghost" onClick={() => setCheckInStep(2)}>Back</Button><Button size="large" onClick={handleSpontaneous}>Check in <ArrowRight /></Button></div><VisitPrivacyPicker /></div> : null}
      {checkInStep === 4 ? <div className="checkin-confirmation" role="status"><span><CheckCircle2 /></span><h3>You’re checked in at {state.facilities.find((facility) => facility.id === facilityId)?.shortName}.</h3><p>Your visit is contributing anonymously to approximate gym and workout-area demand.</p><Button size="large" onClick={closeCheckIn}>View active visit</Button></div> : null}
    </Modal>
    <Modal open={lateOpen} onClose={() => setLateOpen(false)} title="Running late?" description="CampusFit will move your declared arrival and recalculate both forecast windows." label="Adjust arrival">
      <div className="late-options">
        <button type="button" onClick={() => handleDelay(10)}>10 minutes late</button>
        <button type="button" onClick={() => handleDelay(20)}>20 minutes late</button>
        <button type="button" onClick={() => handleDelay(30)}>30 minutes late</button>
      </div>
    </Modal>
    <Modal open={managePlanOpen} onClose={closePlanManager} title={managePlanView === 'cancel' ? `Cancel this ${upcomingVisitType}?` : `Manage your ${upcomingVisitType}`} description={managePlanView === 'cancel' ? 'This cannot be undone, but you can make a new plan at any time.' : 'Change when you plan to arrive or cancel this visit.'} label={managePlanView === 'cancel' ? 'Confirm cancellation' : 'Upcoming visit'}>
      {upcomingVisit && upcomingFacility && managePlanView === 'reschedule' ? <div className="visit-management">
        <div className="visit-management__summary"><span aria-hidden="true"><CalendarClock /></span><div><strong>{upcomingFacility.shortName}</strong><small>{upcomingVisitPurpose} · {upcomingVisit.expectedDurationMinutes} minutes</small><small>Currently {formatDate(upcomingVisit.plannedArrivalAt!, state.university.timezone)} at {formatTime(upcomingVisit.plannedArrivalAt!, state.university.timezone)}</small></div></div>
        <label className="visit-management__field">New arrival date and time<input type="datetime-local" min={toLocalDateTimeInput(state.now)} value={rescheduledArrival} onChange={(event) => setRescheduledArrival(event.target.value)} /></label>
        <p className="visit-management__note">Rescheduling updates your planned contribution in the old and new forecast windows.</p>
        <div className="visit-management__actions"><Button variant="ghost" onClick={closePlanManager}>Keep current time</Button><Button disabled={!canSaveReschedule} onClick={handleReschedule}>Save new time <CalendarClock size={17} /></Button></div>
        <button type="button" className="visit-management__cancel" onClick={() => setManagePlanView('cancel')}><CalendarX2 aria-hidden="true" /><span><strong>Cancel this {upcomingVisitType}</strong><small>Remove it from your plans and CampusFit forecasts.</small></span><ChevronRight aria-hidden="true" /></button>
      </div> : null}
      {upcomingVisit && upcomingFacility && managePlanView === 'cancel' ? <div className="visit-cancel-confirmation">
        <span className="visit-cancel-confirmation__icon" aria-hidden="true"><CalendarX2 /></span>
        <div className="visit-cancel-confirmation__summary"><strong>{upcomingFacility.shortName}</strong><span>{formatDate(upcomingVisit.plannedArrivalAt!, state.university.timezone)} at {formatTime(upcomingVisit.plannedArrivalAt!, state.university.timezone)}</span><small>{upcomingVisitPurpose}</small></div>
        <p>Your planned visit will no longer contribute to scheduled participation or demand estimates.</p>
        <div className="visit-management__actions"><Button variant="ghost" onClick={() => setManagePlanView('reschedule')}>Keep {upcomingVisitType}</Button><Button variant="danger" onClick={handleCancelPlan}>Yes, cancel {upcomingVisitType}</Button></div>
      </div> : null}
    </Modal>
  </div>;
}
