import { AlertTriangle, CheckCircle2, Construction, Dumbbell, ExternalLink, ShieldCheck } from 'lucide-react';
import { useId, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { titleCase } from '../data/catalog';
import type { DemoState } from '../domain/types';
import { getWorkoutEquipmentAvailability } from '../services/equipmentAvailability';
import { DataLabel } from './ui';

interface WorkoutEquipmentStatusProps {
  state: DemoState;
  facilityId: string;
  focus: string;
  comparePath?: string;
}

export function WorkoutEquipmentStatus({ state, facilityId, focus, comparePath }: WorkoutEquipmentStatusProps) {
  const headingId = useId();
  const equipment = useMemo(
    () => getWorkoutEquipmentAvailability(state, facilityId, focus),
    [state, facilityId, focus]
  );
  const facility = state.facilities.find((item) =>
    item.id === facilityId && item.universityId === state.university.id)!;
  const affected = equipment.filter((item) => item.availability !== 'available');
  const available = equipment.filter((item) => item.availability === 'available');
  const focusLabel = titleCase(focus);

  return <section className={`workout-equipment-status ${affected.length ? 'workout-equipment-status--affected' : 'workout-equipment-status--clear'}`} aria-labelledby={headingId}>
    <header className="equipment-status-header">
      <span className="equipment-status-symbol" aria-hidden="true">{affected.length ? <Construction /> : <CheckCircle2 />}</span>
      <div>
        <DataLabel>Student equipment update</DataLabel>
        <h2 id={headingId}>Equipment status for {focusLabel}</h2>
        <p>{affected.length
          ? `${affected.length} ${affected.length === 1 ? 'resource may affect' : 'resources may affect'} your workout at ${facility.shortName}.`
          : `All tracked equipment for your workout is operational at ${facility.shortName}.`}</p>
      </div>
      <span className="equipment-report-source"><ShieldCheck /> Staff reported</span>
    </header>

    {equipment.length === 0 ? <div className="equipment-empty-state"><Dumbbell /><div><strong>No tracked equipment for this focus</strong><p>Check the facility’s activities and spaces for other options.</p></div></div> : null}

    {affected.length ? <div className="affected-equipment-list" aria-live="polite">
      {affected.map((item) => <article className={`equipment-impact-card equipment-impact-card--${item.availability}`} key={item.equipmentTypeId}>
        <div className="equipment-impact-topline">
          <span aria-hidden="true">{item.availability === 'unavailable' ? <AlertTriangle /> : <Construction />}</span>
          <div><h3>{item.displayName}</h3><strong>{item.statusText}</strong></div>
          <span className="equipment-impact-pill">{item.availability === 'unavailable' ? 'Unavailable' : 'Limited'}</span>
        </div>
        <div className="equipment-availability-meter" role="progressbar" aria-label={`${item.displayName} operational units`} aria-valuemin={0} aria-valuemax={item.totalQuantity} aria-valuenow={item.operationalQuantity}>
          <span style={{ width: `${item.totalQuantity ? item.operationalQuantity / item.totalQuantity * 100 : 0}%` }} />
        </div>
        <p>{item.impact}</p>
      </article>)}
    </div> : <div className="equipment-all-clear" role="status"><CheckCircle2 /><div><strong>Everything you need is ready</strong><p>No equipment outages currently affect this {focusLabel} workout.</p></div></div>}

    {available.length ? <div className="available-equipment-section"><div className="available-equipment-heading"><h3>{affected.length ? 'Other equipment for your workout' : 'Available for your workout'}</h3><span>{available.length} operational</span></div><div className="available-equipment-list">{available.map((item) => <div key={item.equipmentTypeId}><CheckCircle2 /><span><strong>{item.displayName}</strong><small>{item.statusText}</small></span></div>)}</div></div> : null}

    <footer className="equipment-status-footer"><span>Status can change during your visit. CampusFit shows staff-reported equipment supply.</span>{comparePath ? <Link to={comparePath}>Compare NYU facilities <ExternalLink /></Link> : null}</footer>
  </section>;
}
