import { AlertTriangle, Clock3, Dumbbell, Info, SlidersHorizontal, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DataLabel, StatusPill } from '../components/ui';
import { WorkoutEquipmentStatus } from '../components/WorkoutEquipmentStatus';
import { activities, workoutFocuses } from '../data/catalog';
import { useTenant } from '../data/TenantContext';
import { calculateEquipmentDemand } from '../services/equipmentDemand';

export function ActivityPage() {
  const { state } = useTenant();
  const [facilityId, setFacilityId] = useState(state.currentUser.preferredFacilityId ?? state.facilities[0]!.id);
  const [mode, setMode] = useState<'focus' | 'activity'>('focus');
  const [selection, setSelection] = useState('back');
  const facility = state.facilities.find((item) => item.id === facilityId)!;
  const demands = useMemo(() => calculateEquipmentDemand(state, facilityId, state.now, mode === 'focus' ? selection : undefined, mode === 'activity' ? selection : undefined).filter((item) => mode === 'activity' || state.equipmentTypes.find((type) => type.id === item.equipmentTypeId)?.supportedFocuses.includes(selection)).slice(0, 10), [state, facilityId, mode, selection]);
  return <div className="page-stack activity-page"><header className="page-header"><div><DataLabel>Equipment & activity demand</DataLabel><h1>A crowd score isn’t enough.</h1><p>See the resources your workout or activity needs—and where queues are likely to form.</p></div></header>
    <section className="demand-filter-card"><div className="filter-toggle"><button className={mode === 'focus' ? 'is-active' : ''} onClick={() => { setMode('focus'); setSelection('back'); }}><Dumbbell />Workout focus</button><button className={mode === 'activity' ? 'is-active' : ''} onClick={() => { setMode('activity'); setSelection('badminton'); }}><SlidersHorizontal />Activity</button></div><div className="filter-fields"><label>Facility<select value={facilityId} onChange={(event) => setFacilityId(event.target.value)}>{state.facilities.map((item) => <option value={item.id} key={item.id}>{item.shortName}</option>)}</select></label><label>{mode === 'focus' ? 'Workout focus' : 'Activity'}<select value={selection} onChange={(event) => setSelection(event.target.value)}>{(mode === 'focus' ? workoutFocuses : activities.filter((item) => facility.activities.includes(item.key))).map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label></div></section>
    <section className="demand-summary"><div><span className="kicker"><Sparkles size={14} />{mode === 'activity' ? 'Activity-specific read' : 'Workout-specific read'}</span><h2>{facility.shortName} may feel manageable overall—<br /><em>but your {selection.replaceAll('_', ' ')} plan tells a different story.</em></h2><p>Relevant resource supply, active and planned users, typical usage duration, and outages are considered together.</p></div><div className="demand-alert"><AlertTriangle /><strong>{demands.filter((item) => ['high', 'very_high'].includes(item.demandLevel)).length}</strong><span>high-demand resources</span></div></section>
    {mode === 'focus' ? <WorkoutEquipmentStatus state={state} facilityId={facilityId} focus={selection} comparePath="/nyu/facilities" /> : null}
    <div className="demand-card-grid">{demands.map((item) => <article className="demand-card" key={item.equipmentTypeId}><div><span className="equipment-icon"><Dumbbell /></span><StatusPill level={item.demandLevel} /></div><h3>{item.displayName}</h3><p>{item.explanation}</p><footer><span><Clock3 />Likely wait</span><strong>{item.queueRange[0]}–{item.queueRange[1]} min</strong></footer></article>)}</div>
    <div className="source-footer"><Info /><p>Demand estimates are deterministic ranges, not promises. Confidence is {demands[0]?.confidence ?? 'low'} because official equipment sensors and university occupancy feeds are not connected.</p></div>
  </div>;
}
