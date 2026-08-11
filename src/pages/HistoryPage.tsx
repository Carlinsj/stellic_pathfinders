import { ArrowRight, CalendarDays, Clock3, MapPin, Plus, ShieldCheck, Timer, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, DataLabel, EmptyState, SectionHeader, StatusPill } from '../components/ui';
import { useCampusFit } from '../data/CampusFitContext';
import { activities, workoutFocuses } from '../data/catalog';
import { useTenant } from '../data/TenantContext';
import { formatDate, formatTime } from '../lib/format';
import { getVisitWorkoutFocuses } from '../services/workoutFocus';
import { getRecordedVisitDurationMinutes } from '../services/visitDuration';

const workoutFocusLabel = (focuses: string[]): string =>
  focuses.map((key) => workoutFocuses.find((item) => item.key === key)?.label).filter(Boolean).join(' + ') || 'Workout';

export function HistoryPage() {
  const { tenant, state } = useTenant();
  const { updateTenant } = useCampusFit();
  const personalVisits = state.visits.filter((visit) => visit.userId === state.currentUser.id);
  const currentVisits = personalVisits.filter((visit) => ['checked_in', 'planned', 'delayed'].includes(visit.status));
  const visits = personalVisits.filter((visit) => ['completed', 'auto_closed', 'cancelled'].includes(visit.status)).sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  const [visibleVisitCount, setVisibleVisitCount] = useState(12);
  const visibleVisits = visits.slice(0, visibleVisitCount);
  const deleteVisit = (id: string) => {
    setVisibleVisitCount((current) => Math.max(0, current - 1));
    updateTenant(tenant, (current) => ({ ...current, visits: current.visits.filter((visit) => visit.id !== id), history: current.history.filter((entry) => entry.visitId !== id) }), 'Personal visit history deleted');
  };

  return <div className="page-stack history-page">
    <header className="page-header history-page-header"><div><DataLabel>Your visits</DataLabel><h1>Your CampusFit activity, kept private.</h1><p>See current plans and your own past visits. Other students never see this history.</p></div><Link className="button button--primary button--medium" to={`/${tenant}/plan`}><Plus aria-hidden="true" /> Plan a visit</Link></header>

    <aside className="privacy-badge" aria-label="History privacy"><ShieldCheck aria-hidden="true" /><span><strong>Private to {state.currentUser.fullName}</strong><small>Only aggregate participation contributes to CampusFit estimates.</small></span></aside>

    {currentVisits.length ? <section aria-labelledby="current-visits-title"><SectionHeader eyebrow="Now and next" title="Active and upcoming" titleId="current-visits-title" description="Manage live visits and saved plans from the dashboard." /><div className="current-visit-list">{currentVisits.map((visit) => {
      const facility = state.facilities.find((item) => item.id === visit.facilityId);
      const purpose = visit.intent === 'activity' ? activities.find((item) => item.key === visit.activity)?.label ?? 'Activity' : workoutFocusLabel(getVisitWorkoutFocuses(visit));
      const timing = visit.status === 'checked_in' ? `Expected finish ${formatTime(visit.expectedEndAt!, state.university.timezone)}` : `${formatDate(visit.plannedArrivalAt!, state.university.timezone)} at ${formatTime(visit.plannedArrivalAt!, state.university.timezone)}`;
      return <article key={visit.id}><span className="current-visit-icon">{visit.status === 'checked_in' ? <Timer aria-hidden="true" /> : <CalendarDays aria-hidden="true" />}</span><div className="current-visit-content"><StatusPill level={visit.status} /><h2>{facility?.shortName}</h2><p>{purpose}</p><small>{timing}</small></div><Link to={`/${tenant}/home`}>Manage visit <ArrowRight aria-hidden="true" /></Link></article>;
    })}</div></section> : null}

    <section aria-labelledby="past-visits-title"><SectionHeader eyebrow="Visit history" title="Past visits" titleId="past-visits-title" description="Completed, cancelled, and automatically closed visits." />{visits.length === 0 ? <EmptyState title="No completed visits yet" body="Check out after your first CampusFit visit and it will appear here." action={<Link className="button button--primary button--medium" to={`/${tenant}/plan`}>Plan your first visit</Link>} /> : <><p className="history-summary-line">Showing {visibleVisits.length} of {visits.length} private visits, newest first.</p><div className="history-list">{visibleVisits.map((visit) => {
      const facility = state.facilities.find((item) => item.id === visit.facilityId);
      const purpose = visit.intent === 'activity' ? activities.find((item) => item.key === visit.activity)?.label ?? 'Activity' : workoutFocusLabel(getVisitWorkoutFocuses(visit));
      const recordedMinutes = getRecordedVisitDurationMinutes(visit);
      const visitDate = visit.checkedInAt ?? visit.updatedAt;
      return <article key={visit.id}><div className="history-date" aria-hidden="true"><span>{formatDate(visitDate, state.university.timezone).split(' ')[0]}</span><strong>{new Date(visitDate).getDate()}</strong></div><div className="history-content"><div><h2>{facility?.shortName ?? 'Facility'}</h2><StatusPill level={visit.status} /></div><p><MapPin aria-hidden="true" />{facility?.address}</p><p><CalendarDays aria-hidden="true" />{formatDate(visitDate, state.university.timezone)} <Clock3 aria-hidden="true" />{formatTime(visitDate, state.university.timezone)}</p><small>{purpose} · {visit.intent === 'activity' ? 'Activity only' : 'Workout'}</small>{recordedMinutes !== undefined ? <div className="history-duration"><span><b>{visit.status === 'auto_closed' ? 'Recorded' : 'Actual'}</b>{recordedMinutes} min</span><span><b>Expected</b>{visit.expectedDurationMinutes} min</span></div> : <div className="history-duration"><span><b>Expected</b>{visit.expectedDurationMinutes} min</span></div>}</div><Button variant="ghost" size="small" aria-label={`Delete ${facility?.shortName ?? 'visit'} history`} onClick={() => deleteVisit(visit.id)}><Trash2 aria-hidden="true" /></Button></article>;
    })}</div>{visibleVisitCount < visits.length ? <Button className="history-load-more" variant="secondary" onClick={() => setVisibleVisitCount((current) => current + 12)}>Show 12 more visits</Button> : null}</>}</section>

    <section className="retention-card"><ShieldCheck aria-hidden="true" /><div><h2>How your history is handled</h2><p>Individual visit details remain private to your account. Old visits are designed to expire or be aggregated under university retention settings. Deleting history does not attempt to remove already anonymized statistics.</p></div></section>
  </div>;
}
