import { Activity, ArrowRightLeft, CalendarPlus, CheckCircle2, Clock3, Dumbbell, Mountain, Power, RotateCcw, ShieldAlert, UserPlus, Waves } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button, DataLabel } from '../components/ui';
import { activityEquipment, focusEquipmentWeights } from '../data/catalog';
import { useCampusFit } from '../data/CampusFitContext';
import { useTenant } from '../data/TenantContext';
import type { DemoState, Visit } from '../domain/types';
import { addMinutes, formatTime } from '../lib/format';
import { markEquipmentUnavailable } from '../services/staffOperations';

const addSyntheticVisit = (state: DemoState, status: 'planned' | 'checked_in', focus: string, activity?: string): DemoState => {
  const facility = state.facilities.find((item) => !activity || item.activities.includes(activity)) ?? state.facilities[0]!;
  const index = state.visits.length;
  const arrival = status === 'planned' ? addMinutes(state.now, 30) : undefined;
  const visit: Visit = {
    id: `demo_control_${index}`,
    universityId: state.university.id,
    userId: `demo_control_user_${index}`,
    userDisplayName: 'Synthetic demo student',
    facilityId: facility.id,
    status,
    source: 'demo',
    intent: activity ? 'activity' : 'workout',
    plannedArrivalAt: arrival,
    originalPlannedArrivalAt: arrival,
    checkedInAt: status === 'checked_in' ? state.now : undefined,
    expectedDurationMinutes: 60,
    expectedEndAt: status === 'checked_in' ? addMinutes(state.now, 60) : undefined,
    autoCloseAt: status === 'checked_in' ? addMinutes(state.now, 60 + state.university.autoCloseGraceMinutes) : undefined,
    lastActivityAt: status === 'checked_in' ? state.now : undefined,
    primaryWorkoutFocus: activity ? undefined : focus,
    secondaryFocuses: [],
    activity,
    equipmentNeeds: activity ? activityEquipment[activity] ?? [] : Object.keys(focusEquipmentWeights[focus] ?? {}),
    privacyLevel: 'anonymous_aggregate',
    reliabilityWeight: 1,
    createdAt: state.now,
    updatedAt: state.now
  };
  return { ...state, visits: [...state.visits, visit] };
};

function DemoAction({ icon, title, body, onClick, label }: { icon: ReactNode; title: string; body: string; onClick: () => void; label: string }) {
  return <article className="demo-action"><span>{icon}</span><div><h3>{title}</h3><p>{body}</p></div><Button variant="secondary" size="small" onClick={onClick}>{label}</Button></article>;
}

export function DemoControlsPage() {
  const { tenant, state } = useTenant();
  const { updateTenant, resetTenant } = useCampusFit();
  const active = state.visits.filter((visit) => visit.status === 'checked_in');
  const planned = state.visits.filter((visit) => visit.status === 'planned' || visit.status === 'delayed');
  const action = (updater: (current: DemoState) => DemoState, message: string) => updateTenant(tenant, updater, message);
  return <div className="page-stack demo-page"><header className="page-header"><div><DataLabel>Competition control room</DataLabel><h1>Tell the CampusFit story live.</h1><p>Every control mutates deterministic synthetic data and updates relevant aggregates without a page reload.</p></div><Button variant="danger" onClick={() => resetTenant(tenant)}><RotateCcw />Reset {state.university.shortName} demo</Button></header>
    <section className="demo-status"><span className="live-beacon" /><div><strong>Demo clock · {formatTime(state.now, state.university.timezone)}</strong><p>{active.length} active check-ins · {planned.length} future plans · synthetic sources only</p></div><span>READY</span></section>
    <section><div className="section-row"><div><DataLabel>Fast controls</DataLabel><h2>Trigger a visible update</h2></div></div><div className="demo-action-grid">
      <DemoAction icon={<CalendarPlus />} title="Add a planned visit" body="Adds declared future demand 30 minutes from now." label="Add plan" onClick={() => action((current) => addSyntheticVisit(current, 'planned', 'back'), 'Synthetic plan added — forecast updated')} />
      <DemoAction icon={<UserPlus />} title="Spontaneous check-in" body="Adds one anonymous active strength visit." label="Check user in" onClick={() => action((current) => addSyntheticVisit(current, 'checked_in', 'general_strength'), 'Synthetic student checked in')} />
      <DemoAction icon={<Clock3 />} title="Delay a planned visit" body="Moves the next plan 20 minutes and shifts demand intervals." label="Delay 20 min" onClick={() => action((current) => { const target = current.visits.find((visit) => visit.status === 'planned' && visit.plannedArrivalAt); return target ? { ...current, visits: current.visits.map((visit) => visit.id === target.id ? { ...visit, status: 'delayed', plannedArrivalAt: addMinutes(visit.plannedArrivalAt!, 20), updatedAt: current.now } : visit) } : current; }, 'Plan delayed — both forecast intervals recalculated')} />
      <DemoAction icon={<Power />} title="Check a user out" body="Removes one synthetic user from live counts and equipment pressure." label="Check user out" onClick={() => action((current) => { const target = current.visits.find((visit) => visit.status === 'checked_in' && visit.userId.startsWith(`${tenant}_synthetic`)); return target ? { ...current, visits: current.visits.map((visit) => visit.id === target.id ? { ...visit, status: 'completed', checkedOutAt: current.now, updatedAt: current.now } : visit) } : current; }, 'Synthetic user checked out — live demand decreased')} />
      <DemoAction icon={<Activity />} title="Add squash demand" body="Creates a spontaneous squash check-in at a supported facility." label="Add squash" onClick={() => action((current) => addSyntheticVisit(current, 'checked_in', 'general_workout', 'squash'), 'Squash activity updated with privacy threshold applied')} />
      <DemoAction icon={<Waves />} title="Add badminton demand" body="Creates a planned or live badminton signal where supported." label="Add badminton" onClick={() => action((current) => addSyntheticVisit(current, 'checked_in', 'general_workout', 'badminton'), 'Badminton activity demand increased')} />
      <DemoAction icon={<Mountain />} title="Add climbing demand" body="Adds a climbing check-in only at a facility with a wall." label="Add climbing" onClick={() => action((current) => addSyntheticVisit(current, 'checked_in', 'full_body', 'climbing'), 'Climbing demand increased')} />
      <DemoAction icon={<Dumbbell />} title="Trigger cable outage" body="Reduces operational cable supply by two units." label="Trigger outage" onClick={() => action((current) => markEquipmentUnavailable(current, current.facilities[0]!.id, 'cable', 2, 'Demo outage'), 'Cable outage active — recommendations recalculated')} />
      <DemoAction icon={<ArrowRightLeft />} title="Move an active visit" body="Moves one synthetic visit to the next facility." label="Move user" onClick={() => action((current) => { const target = current.visits.find((visit) => visit.status === 'checked_in' && visit.userId.startsWith(`${tenant}_synthetic`)); const next = target ? current.facilities[(current.facilities.findIndex((item) => item.id === target.facilityId) + 1) % current.facilities.length] : undefined; return target && next ? { ...current, visits: current.visits.map((visit) => visit.id === target.id ? { ...visit, facilityId: next.id, updatedAt: current.now } : visit) } : current; }, 'Synthetic visit moved — both facilities updated')} />
    </div></section>
    <section className="demo-script"><div><DataLabel>Under-three-minute scenario</DataLabel><h2>{tenant === 'nyu' ? 'Maya’s smarter back workout' : 'Jordan’s better badminton window'}</h2></div><ol>{(tenant === 'nyu' ? ['Open Plan and select Palladium at 6:00 PM.', 'Choose Back + Biceps and review high cable, pull-up, and rowing demand.', 'Save the plan, then use Running late to shift arrival by 20 minutes.', 'Tap I’m here to convert the plan into an active visit without double counting.', 'Add squash demand here, change the live focus if desired, then tap I’m done.'] : ['Open Plan and compare badminton-capable facilities at 6:00 PM.', 'See how the ARC court outage changes the facility ranking.', 'Save Jordan’s plan and delay the arrival by 20 minutes.', 'Tap I’m here to update live badminton demand.', 'Trigger another badminton check-in, then check Jordan out.']).map((step, index) => <li key={step}><span>{index + 1}</span>{step}</li>)}</ol><footer><CheckCircle2 /> All screens use the same tenant-aware domain services.</footer></section>
    <section className="demo-warning"><ShieldAlert /><p><strong>Demo administrator surface</strong><br />These controls expose synthetic scenario operations for judges. They are not student-facing production capabilities and cannot edit aggregate counts directly.</p></section>
  </div>;
}
