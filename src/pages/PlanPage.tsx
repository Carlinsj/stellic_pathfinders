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

const stepLabels = ['Workout', 'Time', 'Gym', 'Review'];

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
  const [day, setDay] = useState<'today' | 'tomorrow' | 'date'>('today');
  const [customDate, setCustomDate] = useState(state.now.slice(0, 10));
  const [visitIntent, setVisitIntent] = useState<VisitIntent>(initialIntent);
  const [focus, setFocus] = useState(search.get('focus') ?? 'back');
  const [secondary, setSecondary] = useState<string[]>(focus === 'back' ? ['biceps'] : []);
  const [activity, setActivity] = useState(initialActivity);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>(() => initialIntent === 'workout' ? Object.keys(focusEquipmentWeights[search.get('focus') ?? 'back'] ?? {}).slice(0, 3) : []);
  const [duration, setDuration] = useState(50);
  const [selectedFacility, setSelectedFacility] = useState(search.get('facility') ?? state.currentUser.preferredFacilityId ?? state.facilities[0]!.id);
  const [privacy, setPrivacy] = useState<PrivacyLevel>(state.currentUser.defaultPrivacyLevel);
  const arrivalForTime = (timeValue: string) => {
    const date = new Date(state.now);
    if (day === 'tomorrow') date.setDate(date.getDate() + 1);
    if (day === 'date') {
      const [year, month, dateOfMonth] = customDate.split('-').map(Number);
      if (year && month && dateOfMonth) date.setFullYear(year, month - 1, dateOfMonth);
    }
    return replaceTime(date.toISOString(), timeValue);
  };
  const arrivalAt = arrivalForTime(time);
  const recommendations = useMemo(() => recommendFacilities(state, arrivalAt, visitIntent === 'workout' ? focus : undefined, activity || undefined, duration, selectedEquipment), [state, arrivalAt, visitIntent, focus, activity, duration, selectedEquipment]);
  const selectedRecommendation = recommendations.find((item) => item.facility.id === selectedFacility) ?? recommendations[0]!;
  const best = recommendations.find((item) => item.eligible)!;
  const bestGuidance = getRecommendationGuidance(best);
  const bestFitLabel = bestGuidance.verdict === 'strong_fit' ? 'Strong fit' : 'Best available';
  const quickTimes = suggestedTime ? ['17:30', '18:00', '18:30', suggestedTime] : ['17:30', '18:00', '18:30', '19:30'];
  const timeSlots = [...new Set(quickTimes)].map((item) => {
    const slotArrival = arrivalForTime(item);
    const slotRecommendations = recommendFacilities(state, slotArrival, visitIntent === 'workout' ? focus : undefined, activity || undefined, duration, selectedEquipment);
    return { time: item, crowd: slotRecommendations.find((recommendation) => recommendation.eligible)?.forecast.crowdLevel ?? 'unknown' };
  });
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
    <header className="page-header"><div><DataLabel>Plan a workout</DataLabel><h1>Build a better NYU gym visit.</h1><p>Four simple choices. CampusFit handles the comparison.</p></div></header>
    <ol className="wizard-steps" aria-label="Planning progress">{stepLabels.map((label, index) => <li key={label} className={index === step ? 'is-current' : index < step ? 'is-complete' : ''}><span>{index < step ? <Check size={15} /> : index + 1}</span><b>{label}</b></li>)}</ol>

    <section className="wizard-card">
      {step === 1 ? <div className="wizard-panel"><div className="wizard-heading"><CalendarDays /><div><h2>When works for you?</h2><p>Demand labels update for the workout you just chose.</p></div></div><div className="day-picker" role="group" aria-label="Workout day"><button type="button" className={day === 'today' ? 'is-selected' : ''} onClick={() => setDay('today')}><strong>Today</strong><small>{new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(state.now))}</small></button><button type="button" className={day === 'tomorrow' ? 'is-selected' : ''} onClick={() => setDay('tomorrow')}><strong>Tomorrow</strong><small>{new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(Date.parse(state.now) + 86_400_000))}</small></button><button type="button" className={day === 'date' ? 'is-selected' : ''} onClick={() => setDay('date')}><strong>Pick a date</strong><small>Plan ahead</small></button></div>{day === 'date' ? <label className="large-input-label">Date<input type="date" value={customDate} min={state.now.slice(0, 10)} onChange={(event) => setCustomDate(event.target.value)} /></label> : null}<label className="large-input-label">Arrival time<input type="time" value={time} onChange={(event) => setTime(event.target.value)} /></label><div className="quick-times time-slot-grid">{timeSlots.map((item) => <button type="button" key={item.time} onClick={() => setTime(item.time)} className={time === item.time ? 'is-selected' : ''}><strong>{formatTime(arrivalForTime(item.time), state.university.timezone)}</strong><small>{item.time === suggestedTime ? 'CampusFit pick · ' : ''}{crowdLabel(item.crowd)}</small></button>)}</div><div className="info-callout"><Info size={18} /><p><strong>Better after 7:30</strong><br />Evening demand usually eases after the NYU post-class peak.</p></div></div> : null}

      {step === 0 ? <div className="wizard-panel"><div className="wizard-heading"><Dumbbell /><div><h2>What are you doing?</h2><p>Workout-specific demand is what makes CampusFit useful.</p></div></div><div className="visit-intent-picker"><span className="field-label">Visit purpose</span><SegmentedControl label="Visit purpose" value={visitIntent} onChange={handleIntentChange} options={[{ value: 'workout', label: 'Workout' }, { value: 'activity', label: 'Activity only' }]} /><p>{visitIntent === 'activity' ? 'No workout focus or strength-equipment demand will be added.' : 'Choose the focus that matters most today.'}</p></div>{visitIntent === 'workout' ? <><fieldset className="choice-grid"><legend>Primary focus</legend>{workoutFocuses.map((item) => <button type="button" key={item.key} className={focus === item.key ? 'is-selected' : ''} onClick={() => { setFocus(item.key); setSelectedEquipment(Object.keys(focusEquipmentWeights[item.key] ?? {}).slice(0, 3)); }}><span className="choice-icon">{item.label.slice(0, 1)}</span><span>{item.label}</span>{focus === item.key ? <Check size={16} /> : null}</button>)}</fieldset><details className="plan-options"><summary>Fine-tune this workout</summary><fieldset className="choice-grid choice-grid--small"><legend>Optional secondary focus</legend>{workoutFocuses.filter((item) => item.key !== focus).slice(0, 6).map((item) => <button type="button" key={item.key} className={secondary.includes(item.key) ? 'is-selected' : ''} onClick={() => setSecondary((current) => current.includes(item.key) ? current.filter((key) => key !== item.key) : [...current, item.key])}>{item.label}</button>)}</fieldset><div className="plan-extras"><label>Activity <span className="optional">Optional</span><select value={activity} onChange={(event) => setActivity(event.target.value)}><option value="">No activity</option>{activities.filter((item) => state.facilities.some((facility) => facility.activities.includes(item.key))).map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label><fieldset><legend>Expected equipment</legend><div>{Object.keys(focusEquipmentWeights[focus] ?? {}).map((key) => { const equipment = state.equipmentTypes.find((item) => item.id === key); return <label key={key}><input type="checkbox" checked={selectedEquipment.includes(key)} onChange={() => setSelectedEquipment((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key])} />{equipment?.displayName ?? key}</label>; })}</div></fieldset></div></details></> : <div className="activity-only-card"><label>Choose your activity<select aria-label="Choose your activity" value={activity} onChange={(event) => handleActivityChange(event.target.value)}>{activities.filter((item) => state.facilities.some((facility) => facility.activities.includes(item.key))).map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label><div><strong>{purposeLabel}</strong><span>{recommendations.filter((item) => item.eligible).length} supported NYU gyms</span><small>Rankings use courts, lanes, walls, studios, or bikes—without adding workout demand.</small></div></div>}<label className="range-label"><span><b>{visitIntent === 'activity' ? 'Expected activity time' : 'Your normal workout'}</b><strong>{duration} min</strong></span><input type="range" min="30" max="100" step="5" value={duration} onChange={(event) => setDuration(Number(event.target.value))} /></label></div> : null}

      {step === 2 ? <div className="wizard-panel"><div className="wizard-heading"><Sparkles /><div><h2>Choose your NYU gym</h2><p>Ranked for {purposeLabel.toLowerCase()} at {formatTime(arrivalAt, state.university.timezone)}.</p></div></div><button type="button" className="recommend-for-me" onClick={() => setSelectedFacility(best.facility.id)}><Sparkles /><span><strong>Recommend one for me</strong><small>{bestGuidance.summary}</small></span><ArrowRight /></button><div className="compare-list">{recommendations.map((item, index) => <button type="button" key={item.facility.id} onClick={() => item.eligible && setSelectedFacility(item.facility.id)} disabled={!item.eligible} className={`compare-option ${selectedFacility === item.facility.id ? 'is-selected' : ''}`}><span className="compare-rank">{item.eligible ? index + 1 : '—'}</span><span className="compare-facility"><strong>{item.facility.shortName}<em>{!item.eligible ? 'Not recommended' : index === 0 ? bestFitLabel : index === 1 ? 'Good alternative' : 'Less suitable'}</em></strong><small><MapPin size={13} />{item.facility.travelMinutes} min · {crowdLabel(item.forecast.crowdLevel)}</small><small className="compare-reason">{item.explanation}</small></span><span className="compare-duration"><strong>{item.duration.durationRange[0]}–{item.duration.durationRange[1]} min</strong><small>{item.duration.additionalWaitRange[0]}–{item.duration.additionalWaitRange[1]} min waiting</small></span><StatusPill level={item.eligible ? item.forecast.crowdLevel : 'unknown'}>{item.eligible ? undefined : 'Unavailable'}</StatusPill>{selectedFacility === item.facility.id ? <Check className="compare-check" /> : null}</button>)}</div>{selectedFacility !== best.facility.id ? <div className="recommendation-note"><Sparkles size={18} /><p><strong>CampusFit ranks {best.facility.shortName} highest</strong><br />{bestGuidance.summary} {best.explanation}</p><button onClick={() => setSelectedFacility(best.facility.id)}>Use highest-ranked</button></div> : null}</div> : null}

      {step === 3 ? <div className="wizard-panel"><div className="wizard-heading"><Check /><div><h2>Your best move</h2><p>Review the recommendation before saving.</p></div></div><div className="plan-review-hero"><div><DataLabel>{formatTime(arrivalAt, state.university.timezone)} · {day === 'tomorrow' ? 'Tomorrow' : day === 'date' ? customDate : 'Today'} · {visitIntent === 'activity' ? 'Activity only' : 'Workout'}</DataLabel><h3>{selectedRecommendation.facility.shortName}</h3><p>{purposeLabel}{visitIntent === 'workout' && secondary.length ? ` + ${secondary.map((key) => workoutFocuses.find((item) => item.key === key)?.label).join(', ')}` : ''}</p></div><StatusPill level={selectedRecommendation.forecast.crowdLevel} /></div><div className="review-metrics"><div><Timer /><strong>{selectedRecommendation.duration.durationRange[0]}–{selectedRecommendation.duration.durationRange[1]} min</strong><span>Your workout should take</span><small>Normal: {duration} min</small></div><div><UsersRound /><strong>{selectedRecommendation.forecast.expectedRange[0]}–{selectedRecommendation.forecast.expectedRange[1]}</strong><span>CampusFit prediction</span><small>{selectedRecommendation.forecast.confidence} confidence</small></div><div><Clock3 /><strong>+{selectedRecommendation.duration.additionalWaitRange[0]}–{selectedRecommendation.duration.additionalWaitRange[1]} min</strong><span>Expected wait</span><small>{selectedRecommendation.duration.delayCauses.slice(0, 2).join(', ') || 'No main delay'}</small></div></div><div className="equipment-review"><h3>{visitIntent === 'activity' ? 'Activity-resource demand' : 'Workout-specific demand'}</h3>{demand.map((item) => <div key={item.equipmentTypeId}><span>{item.displayName}</span><StatusPill level={item.demandLevel} /><b>{item.queueRange[0]}–{item.queueRange[1]} min</b></div>)}</div>{best.facility.id !== selectedRecommendation.facility.id ? <div className="alternative-card"><Sparkles /><div><strong>Try {best.facility.shortName} instead</strong><span>{best.explanation}</span></div><button onClick={() => setSelectedFacility(best.facility.id)}>Switch</button></div> : null}<label>Privacy for this visit<select value={privacy} onChange={(event) => setPrivacy(event.target.value as PrivacyLevel)}><option value="anonymous_aggregate">Anonymous aggregate</option><option value="friends_only">Friends only</option><option value="private">Private</option></select></label><div className="source-note"><Info size={17} /><p>Ranges use historical patterns, planned visits, CampusFit check-ins, operating hours, and relevant resource supply. No official occupancy feed is connected.</p></div></div> : null}

      <footer className="wizard-footer"><Button variant="ghost" onClick={() => step === 0 ? navigate(`/${tenant}/home`) : setStep((current) => current - 1)}><ArrowLeft size={17} /> {step === 0 ? 'Cancel' : 'Back'}</Button>{step < 3 ? <Button disabled={step === 0 && visitIntent === 'activity' && !activity} onClick={() => setStep((current) => current + 1)}>Continue <ArrowRight size={17} /></Button> : <Button size="large" onClick={savePlan}>Save visit plan <Check size={18} /></Button>}</footer>
    </section>
  </div>;
}
