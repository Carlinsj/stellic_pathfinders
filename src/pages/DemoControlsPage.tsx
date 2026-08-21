import { Activity, ArrowRightLeft, CalendarPlus, CheckCircle2, Clock3, Dumbbell, Mountain, Power, RotateCcw, ShieldAlert, UserPlus, Waves } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Button, ConfirmationDialog, DataLabel, ManagementPageHeader, ManagementSectionHeader } from '../components/ui';
import { useCampusFit } from '../data/CampusFitContext';
import { useTenant } from '../data/TenantContext';
import { formatTime } from '../lib/format';
import type { DemoAction as DemoActionName } from '../services/demoOperations';

function DemoAction({ icon, title, body, onClick, label, disabled = false }: { icon: ReactNode; title: string; body: string; onClick: () => void; label: string; disabled?: boolean }) {
  return <article className="demo-action"><span aria-hidden="true">{icon}</span><div><h3>{title}</h3><p>{body}</p></div><Button variant="secondary" size="small" onClick={onClick} disabled={disabled}>{label}</Button></article>;
}

export function DemoControlsPage() {
  const { tenant, state } = useTenant();
  const { runDemoAction, resetTenant } = useCampusFit();
  const [resetConfirmationOpen, setResetConfirmationOpen] = useState(false);
  const active = state.visits.filter((visit) => visit.status === 'checked_in');
  const planned = state.visits.filter((visit) => visit.status === 'planned' || visit.status === 'delayed');
  const activeCount = state.demoStatus?.activeCheckIns ?? active.length;
  const plannedCount = state.demoStatus?.futurePlans ?? planned.length;
  const hasPlannedVisit = state.demoStatus?.hasPlannedVisit ?? state.visits.some((visit) => visit.status === 'planned' && visit.plannedArrivalAt);
  const hasSyntheticActiveVisit = state.demoStatus?.hasSyntheticActiveVisit ?? state.visits.some((visit) => visit.status === 'checked_in' && visit.userId.startsWith(`${tenant}_synthetic`));
  const action = (actionName: DemoActionName, message: string) => void runDemoAction(tenant, actionName, message);
  return <div className="page-stack demo-page"><ManagementPageHeader eyebrow="Competition control room" title="Tell the CampusFit story live" description="Every control mutates deterministic synthetic data and updates relevant aggregates without a page reload." actions={<Button variant="danger" onClick={() => setResetConfirmationOpen(true)}><RotateCcw />Reset {state.university.shortName} demo</Button>} />
    <section className="demo-status"><span className="live-beacon" /><div><strong>Demo clock · {formatTime(state.now, state.university.timezone)}</strong><p>{activeCount} active check-ins · {plannedCount} future plans · synthetic sources only</p></div><span>READY</span></section>
    <section className="demo-control-section"><ManagementSectionHeader eyebrow="Visit lifecycle" title="Plans and check-ins" description="Create or move synthetic visits through existing CampusFit lifecycle states." /><div className="demo-action-grid">
      <DemoAction icon={<CalendarPlus />} title="Add a planned visit" body="Adds declared future demand 30 minutes from now." label="Add plan" onClick={() => action('add_plan', 'Synthetic plan added — forecast updated')} />
      <DemoAction icon={<UserPlus />} title="Spontaneous check-in" body="Adds one anonymous active strength visit." label="Check user in" onClick={() => action('check_in', 'Synthetic student checked in')} />
      <DemoAction icon={<Clock3 />} title="Delay a planned visit" body="Moves the next plan 20 minutes and shifts demand intervals." label="Delay 20 min" disabled={!hasPlannedVisit} onClick={() => action('delay_plan', 'Plan delayed — both forecast intervals recalculated')} />
      <DemoAction icon={<Power />} title="Check a user out" body="Removes one synthetic user from live counts and equipment pressure." label="Check user out" disabled={!hasSyntheticActiveVisit} onClick={() => action('check_out', 'Synthetic user checked out — live demand decreased')} />
      <DemoAction icon={<ArrowRightLeft />} title="Move an active visit" body="Moves one synthetic visit to the next facility." label="Move user" disabled={!hasSyntheticActiveVisit} onClick={() => action('move_visit', 'Synthetic visit moved — both facilities updated')} />
    </div></section>
    <section className="demo-control-section"><ManagementSectionHeader eyebrow="Activity signals" title="Program demand" description="Add anonymous synthetic activity demand only at supporting facilities." /><div className="demo-action-grid">
      <DemoAction icon={<Activity />} title="Add squash demand" body="Creates a spontaneous squash check-in at a supported facility." label="Add squash" onClick={() => action('add_squash', 'Squash activity updated with privacy threshold applied')} />
      <DemoAction icon={<Waves />} title="Add badminton demand" body="Creates a planned or live badminton signal where supported." label="Add badminton" onClick={() => action('add_badminton', 'Badminton activity demand increased')} />
      <DemoAction icon={<Mountain />} title="Add climbing demand" body="Adds a climbing check-in only at a facility with a wall." label="Add climbing" onClick={() => action('add_climbing', 'Climbing demand increased')} />
    </div></section>
    <section className="demo-control-section"><ManagementSectionHeader eyebrow="Facility conditions" title="Operational scenario" description="Trigger a supported equipment condition and observe recalculated guidance." /><div className="demo-action-grid demo-action-grid--single">
      <DemoAction icon={<Dumbbell />} title="Trigger cable outage" body="Reduces operational cable supply by two units." label="Trigger outage" onClick={() => action('trigger_cable_outage', 'Cable outage active — recommendations recalculated')} />
    </div></section>
    <section className="demo-script"><div><DataLabel>Under-three-minute NYU scenario</DataLabel><h2>Maya’s smarter back workout</h2></div><ol>{['Open Plan and choose Back + Biceps.', 'Compare NYU gyms at 6:00 PM and review cable, pull-up, and rowing demand.', 'Save the plan, then use Running late to shift arrival by 20 minutes.', 'Tap I’m here to convert the plan into an active visit without double counting.', 'Change the live focus if desired, then wrap up the workout.'].map((step, index) => <li key={step}><span>{index + 1}</span>{step}</li>)}</ol><footer><CheckCircle2 /> All screens use the same NYU-scoped domain services.</footer></section>
    <section className="demo-warning"><ShieldAlert /><p><strong>Demo administrator surface</strong><br />These controls expose synthetic scenario operations for judges. They are not student-facing production capabilities and cannot edit aggregate counts directly.</p></section>
    <ConfirmationDialog open={resetConfirmationOpen} title={`Reset the ${state.university.shortName} demo?`} description="This reverts the synthetic scenario changes created by this demo account and preserves the original tenant seed data." confirmLabel={`Reset ${state.university.shortName} demo`} tone="danger" onClose={() => setResetConfirmationOpen(false)} onConfirm={() => { void resetTenant(tenant); setResetConfirmationOpen(false); }} />
  </div>;
}
