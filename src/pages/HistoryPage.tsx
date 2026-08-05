import { CalendarDays, Clock3, MapPin, ShieldCheck, Trash2 } from 'lucide-react';
import { Button, DataLabel, EmptyState, StatusPill } from '../components/ui';
import { useCampusFit } from '../data/CampusFitContext';
import { activities, workoutFocuses } from '../data/catalog';
import { useTenant } from '../data/TenantContext';
import { formatDate, formatTime } from '../lib/format';

export function HistoryPage() {
  const { tenant, state } = useTenant();
  const { updateTenant } = useCampusFit();
  const visits = state.visits.filter((visit) => visit.userId === state.currentUser.id && ['completed', 'auto_closed', 'cancelled'].includes(visit.status)).sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  const deleteVisit = (id: string) => updateTenant(tenant, (current) => ({ ...current, visits: current.visits.filter((visit) => visit.id !== id), history: current.history.filter((entry) => entry.visitId !== id) }), 'Personal visit history deleted');
  return <div className="page-stack history-page"><header className="page-header"><div><DataLabel>Your private history</DataLabel><h1>Your visits, nobody else’s.</h1><p>Only you can see this view. Delete a visit whenever you want.</p></div><span className="privacy-badge"><ShieldCheck />Private to {state.currentUser.fullName}</span></header>
    {visits.length === 0 ? <EmptyState title="No completed visits yet" body="Check out after your first CampusFit visit and it will appear here." /> : <div className="history-list">{visits.map((visit) => { const facility = state.facilities.find((item) => item.id === visit.facilityId); const purpose = visit.intent === 'activity' ? activities.find((item) => item.key === visit.activity)?.label ?? 'Activity' : workoutFocuses.find((item) => item.key === visit.primaryWorkoutFocus)?.label ?? 'Workout'; return <article key={visit.id}><div className="history-date"><span>{formatDate(visit.checkedInAt ?? visit.updatedAt, state.university.timezone).split(' ')[0]}</span><strong>{new Date(visit.checkedInAt ?? visit.updatedAt).getDate()}</strong></div><div className="history-content"><div><h2>{facility?.shortName ?? 'Facility'}</h2><StatusPill level={visit.status} /></div><p><MapPin />{facility?.address}</p><p><CalendarDays />{formatDate(visit.checkedInAt ?? visit.updatedAt, state.university.timezone)} <Clock3 />{formatTime(visit.checkedInAt ?? visit.updatedAt, state.university.timezone)}</p><small>{purpose} · {visit.intent === 'activity' ? 'Activity only' : 'Workout'} · Expected {visit.expectedDurationMinutes} minutes</small></div><Button variant="ghost" size="small" aria-label={`Delete ${facility?.shortName ?? 'visit'} history`} onClick={() => deleteVisit(visit.id)}><Trash2 /></Button></article>; })}</div>}
    <section className="retention-card"><ShieldCheck /><div><h2>How your history is handled</h2><p>Individual visit details remain private to your account. Old visits are designed to expire or be aggregated under university retention settings. Deleting history does not attempt to remove already anonymized statistics.</p></div></section>
  </div>;
}
