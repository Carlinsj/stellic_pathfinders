import { ArrowLeft, ArrowRight, CalendarDays, Check, Clock3, Dumbbell, Info, MapPin, Sparkles, Timer, UsersRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, DataLabel, SegmentedControl, StatusPill } from '../components/ui';
import { activities, focusEquipmentWeights, workoutFocuses } from '../data/catalog';
import { useCampusFit } from '../data/CampusFitContext';
import { useTenant } from '../data/TenantContext';
import type { PrivacyLevel, VisitIntent } from '../domain/types';
import { crowdLabel, formatTime, replaceTime } from '../lib/format';
import { getRecommendationGuidance, recommendFacilities } from '../services/recommendation';
import { createPlan } from '../services/visitLifecycle';

const stepLabels = ['When', 'Purpose', 'Compare', 'Review'];

export function PlanPage() {
  const { tenant, state } = useTenant();
  const { updateTenant } = useCampusFit();
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const suggestedTime = search.get('time');
  const initialIntent: VisitIntent = search.get('intent') === 'activity' ? 'activity' : 'workout';
  const initialActivity = search.get('activity') ?? (initialIntent === 'activity' ? state.facilities.flatMap((facility) => facility.activities)[0] ?? '' : '');
  const [step, setStep] = useState(0);
  const [time, setTime] = useState(suggestedTime ?? '18:00');
  const [visitIntent, setVisitIntent] = useState<VisitIntent>(initialIntent);
  const [focus, setFocus] = useState(search.get('focus') ?? 'back');
  const [secondary, setSecondary] = useState<string[]>(focus === 'back' ? ['biceps'] : []);
  const [activity, setActivity] = useState(initialActivity);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>(() => initialIntent === 'workout' ? Object.keys(focusEquipmentWeights[search.get('focus') ?? 'back'] ?? {}).slice(0, 3) : []);
  const [duration, setDuration] = useState(50);
  const [selectedFacility, setSelectedFacility] = useState(search.get('facility') ?? state.currentUser.preferredFacilityId ?? state.facilities[0]!.id);
  const [privacy, setPrivacy] = useState<PrivacyLevel>(state.currentUser.defaultPrivacyLevel);
  const arrivalAt = replaceTime(state.now, time);
  const recommendations = useMemo(() => recommendFacilities(state, arrivalAt, visitIntent === 'workout' ? focus : undefined, activity || undefined, duration, selectedEquipment), [state, arrivalAt, visitIntent, focus, activity, duration, selectedEquipment]);
  const selectedRecommendation = recommendations.find((item) => item.facility.id === selectedFacility) ?? recommendations[0]!;
  const best = recommendations.find((item) => item.eligible)!;
  const bestGuidance = getRecommendationGuidance(best);
  const bestFitLabel = bestGuidance.verdict === 'strong_fit' ? 'Strong fit' : 'Best available';
  const quickTimes = suggestedTime ? ['17:30', '18:00', '18:30', suggestedTime] : ['17:30', '18:00', '18:30', '19:30'];
  const demand = selectedRecommendation.equipmentDemand.slice(0, 4);
  const purposeLabel = visitIntent === 'activity'
    ? activities.find((item) => item.key === activity)?.label ?? 'Activity'
    : workoutFocuses.find((item) => item.key === focus)?.label ?? 'Workout';

  const handleIntentChange = (value: string) => {
    const nextIntent = value as VisitIntent;
    setVisitIntent(nextIntent);
    setSecondary(nextIntent === 'workout' && focus === 'back' ? ['biceps'] : []);
    setSelectedEquipment(nextIntent === 'workout' ? Object.keys(focusEquipmentWeights[focus] ?? {}).slice(0, 3) : []);
    if (nextIntent === 'activity') {
      const nextActivity = activity || (state.facilities.flatMap((facility) => facility.activities)[0] ?? '');
      setActivity(nextActivity);
      const supportingFacility = state.facilities.find((facility) => facility.activities.includes(nextActivity));
      if (supportingFacility) setSelectedFacility(supportingFacility.id);
    }
  };
  const handleActivityChange = (nextActivity: string) => {
    setActivity(nextActivity);
    if (visitIntent === 'activity') {
      const supportingFacility = state.facilities.find((facility) => facility.activities.includes(nextActivity));
      if (supportingFacility) setSelectedFacility(supportingFacility.id);
    }
  };

  const savePlan = () => {
    updateTenant(tenant, (current) => createPlan(current, { facilityId: selectedFacility, plannedArrivalAt: arrivalAt, intent: visitIntent, primaryWorkoutFocus: visitIntent === 'workout' ? focus : undefined, secondaryFocuses: visitIntent === 'workout' ? secondary : [], activity: activity || undefined, expectedDurationMinutes: duration, privacyLevel: privacy, equipmentNeeds: visitIntent === 'workout' ? selectedEquipment : undefined }), `${purposeLabel} visit saved for ${formatTime(arrivalAt, state.university.timezone)}`);
    navigate(`/${tenant}/home`);
  };

  return <div className="page-stack plan-page">
    <header className="page-header"><div><DataLabel>Plan a visit</DataLabel><h1>Make time for what you came to do.<br /><em>Not the waiting.</em></h1><p>CampusFit compares workouts and activities across campus.</p></div></header>
    <ol className="wizard-steps" aria-label="Planning progress">{stepLabels.map((label, index) => <li key={label} className={index === step ? 'is-current' : index < step ? 'is-complete' : ''}><span>{index < step ? <Check size={15} /> : index + 1}</span><b>{label}</b></li>)}</ol>

    <section className="wizard-card">
      {step === 0 ? <div className="wizard-panel"><div className="wizard-heading"><CalendarDays /><div><h2>When are you thinking?</h2><p>Choose an arrival window. You can update it anytime.</p></div></div><div className="date-card"><span>Today</span><strong>{new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date(state.now))}</strong><Check /></div><label className="large-input-label">Arrival time<input type="time" value={time} onChange={(event) => setTime(event.target.value)} /></label><div className="quick-times">{[...new Set(quickTimes)].map((item) => <button key={item} onClick={() => setTime(item)} className={time === item ? 'is-selected' : ''}>{formatTime(replaceTime(state.now, item), state.university.timezone)}{item === suggestedTime ? <small>CampusFit pick</small> : null}</button>)}</div><div className="info-callout"><Info size={18} /><p><strong>Evening peak expected</strong><br />Most facilities see their highest overall and cable demand from 5:30–7:00 PM.</p></div></div> : null}

      {step === 1 ? <div className="wizard-panel"><div className="wizard-heading"><Dumbbell /><div><h2>What brings you in?</h2><p>Choose a workout or an activity-only visit so CampusFit measures the right demand.</p></div></div><div className="visit-intent-picker"><span className="field-label">Visit purpose</span><SegmentedControl label="Visit purpose" value={visitIntent} onChange={handleIntentChange} options={[{ value: 'workout', label: 'Workout' }, { value: 'activity', label: 'Activity only' }]} /><p>{visitIntent === 'activity' ? 'No workout focus or strength-equipment demand will be added.' : 'You can still add an optional court, pool, or class activity.'}</p></div>{visitIntent === 'workout' ? <><fieldset className="choice-grid"><legend>Primary focus</legend>{workoutFocuses.map((item) => <button type="button" key={item.key} className={focus === item.key ? 'is-selected' : ''} onClick={() => { setFocus(item.key); setSelectedEquipment(Object.keys(focusEquipmentWeights[item.key] ?? {}).slice(0, 3)); }}><span className="choice-icon">{item.label.slice(0, 1)}</span><span>{item.label}</span>{focus === item.key ? <Check size={16} /> : null}</button>)}</fieldset><fieldset className="choice-grid choice-grid--small"><legend>Optional secondary focus</legend>{workoutFocuses.filter((item) => item.key !== focus).slice(0, 6).map((item) => <button type="button" key={item.key} className={secondary.includes(item.key) ? 'is-selected' : ''} onClick={() => setSecondary((current) => current.includes(item.key) ? current.filter((key) => key !== item.key) : [...current, item.key])}>{item.label}</button>)}</fieldset><div className="plan-extras"><label>Activity <span className="optional">Optional</span><select value={activity} onChange={(event) => setActivity(event.target.value)}><option value="">No activity</option>{activities.filter((item) => state.facilities.some((facility) => facility.activities.includes(item.key))).map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label><fieldset><legend>Expected equipment</legend><div>{Object.keys(focusEquipmentWeights[focus] ?? {}).map((key) => { const equipment = state.equipmentTypes.find((item) => item.id === key); return <label key={key}><input type="checkbox" checked={selectedEquipment.includes(key)} onChange={() => setSelectedEquipment((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key])} />{equipment?.displayName ?? key}</label>; })}</div></fieldset></div></> : <div className="activity-only-card"><label>Choose your activity<select aria-label="Choose your activity" value={activity} onChange={(event) => handleActivityChange(event.target.value)}>{activities.filter((item) => state.facilities.some((facility) => facility.activities.includes(item.key))).map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label><div><strong>{purposeLabel}</strong><span>{recommendations.filter((item) => item.eligible).length} supported facilities open at this time</span><small>Rankings use activity resources such as courts, lanes, walls, studios, or bikes—without adding workout demand.</small></div></div>}<label className="range-label"><span><b>{visitIntent === 'activity' ? 'Expected activity time' : 'Your normal workout'}</b><strong>{duration} min</strong></span><input type="range" min="30" max="100" step="5" value={duration} onChange={(event) => setDuration(Number(event.target.value))} /></label></div> : null}

      {step === 2 ? <div className="wizard-panel"><div className="wizard-heading"><Sparkles /><div><h2>{bestGuidance.verdict === 'strong_fit' ? 'Here’s a strong fit' : 'Here’s the best available fit'}</h2><p>Ranked for {purposeLabel.toLowerCase()} at {formatTime(arrivalAt, state.university.timezone)}.</p></div></div><div className="compare-list">{recommendations.map((item, index) => <button type="button" key={item.facility.id} onClick={() => item.eligible && setSelectedFacility(item.facility.id)} disabled={!item.eligible} className={`compare-option ${selectedFacility === item.facility.id ? 'is-selected' : ''}`}><span className="compare-rank">{item.eligible ? index + 1 : '—'}</span><span className="compare-facility"><strong>{item.facility.shortName}{index === 0 ? <em>{bestFitLabel}</em> : null}</strong><small><MapPin size={13} />{item.facility.travelMinutes} min · {crowdLabel(item.forecast.crowdLevel)}</small></span><span className="compare-duration"><strong>{item.duration.durationRange[0]}–{item.duration.durationRange[1]} min</strong><small>{item.duration.additionalWaitRange[0]}–{item.duration.additionalWaitRange[1]} min waiting</small></span><StatusPill level={item.eligible ? item.forecast.crowdLevel : 'unknown'}>{item.eligible ? undefined : 'Unavailable'}</StatusPill>{selectedFacility === item.facility.id ? <Check className="compare-check" /> : null}</button>)}</div>{selectedFacility !== best.facility.id ? <div className="recommendation-note"><Sparkles size={18} /><p><strong>CampusFit ranks {best.facility.shortName} highest</strong><br />{bestGuidance.summary} {best.explanation}</p><button onClick={() => setSelectedFacility(best.facility.id)}>Use highest-ranked</button></div> : null}</div> : null}

      {step === 3 ? <div className="wizard-panel"><div className="wizard-heading"><Check /><div><h2>Review your plan</h2><p>Forecasts update automatically if your timing changes.</p></div></div><div className="plan-review-hero"><div><DataLabel>{formatTime(arrivalAt, state.university.timezone)} · Today · {visitIntent === 'activity' ? 'Activity only' : 'Workout'}</DataLabel><h3>{selectedRecommendation.facility.shortName}</h3><p>{purposeLabel}{visitIntent === 'workout' && secondary.length ? ` + ${secondary.map((key) => workoutFocuses.find((item) => item.key === key)?.label).join(', ')}` : ''}</p></div><StatusPill level={selectedRecommendation.forecast.crowdLevel} /></div><div className="review-metrics"><div><Timer /><strong>{selectedRecommendation.duration.durationRange[0]}–{selectedRecommendation.duration.durationRange[1]} min</strong><span>Expected duration</span><small>Normal: {duration} min</small></div><div><UsersRound /><strong>{selectedRecommendation.forecast.expectedRange[0]}–{selectedRecommendation.forecast.expectedRange[1]}</strong><span>Predicted visitors</span><small>{selectedRecommendation.forecast.confidence} confidence</small></div><div><Clock3 /><strong>+{selectedRecommendation.duration.additionalWaitRange[0]}–{selectedRecommendation.duration.additionalWaitRange[1]} min</strong><span>Likely waiting</span><small>{selectedRecommendation.duration.delayCauses.slice(0, 2).join(', ') || 'No main delay'}</small></div></div><div className="equipment-review"><h3>{visitIntent === 'activity' ? 'Activity-resource demand' : 'Workout-specific demand'}</h3>{demand.map((item) => <div key={item.equipmentTypeId}><span>{item.displayName}</span><StatusPill level={item.demandLevel} /><b>{item.queueRange[0]}–{item.queueRange[1]} min</b></div>)}</div><label>Privacy for this visit<select value={privacy} onChange={(event) => setPrivacy(event.target.value as PrivacyLevel)}><option value="anonymous_aggregate">Anonymous aggregate</option><option value="friends_only">Friends only</option><option value="private">Private</option></select></label><div className="source-note"><Info size={17} /><p>Ranges use synthetic history, declared plans, CampusFit check-ins, operating hours, and relevant resource supply. No official occupancy feed is connected.</p></div></div> : null}

      <footer className="wizard-footer"><Button variant="ghost" onClick={() => step === 0 ? navigate(`/${tenant}/home`) : setStep((current) => current - 1)}><ArrowLeft size={17} /> {step === 0 ? 'Cancel' : 'Back'}</Button>{step < 3 ? <Button disabled={step === 1 && visitIntent === 'activity' && !activity} onClick={() => setStep((current) => current + 1)}>Continue <ArrowRight size={17} /></Button> : <Button size="large" onClick={savePlan}>Save visit plan <Check size={18} /></Button>}</footer>
    </section>
  </div>;
}
