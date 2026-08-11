import { CalendarClock, Clock3, LogIn, UsersRound } from 'lucide-react';
import type { FacilityParticipationTracker as TrackerData } from '../domain/types';
import { formatTime } from '../lib/format';
import { DataLabel, DataSourceLabel, StatusPill } from './ui';

export function ParticipationTracker({
  tracker,
  facilityName,
  timezone,
  planning = false,
  includeDraftPlan = false
}: {
  tracker: TrackerData;
  facilityName: string;
  timezone: string;
  planning?: boolean;
  includeDraftPlan?: boolean;
}) {
  const scheduledForWindow = tracker.scheduledForWindow + (includeDraftPlan ? 1 : 0);
  const windowLabel = `${formatTime(tracker.intervalStart, timezone)}–${formatTime(tracker.intervalEnd, timezone)}`;

  return <section className={`participation-tracker${planning ? ' participation-tracker--planning' : ''}`} aria-labelledby={`participation-${tracker.facilityId}-${planning ? 'planning' : 'live'}`}>
    <header className="participation-tracker__header">
      <div>
        <DataLabel>{planning ? `Planning window · ${facilityName}` : `Live at ${facilityName}`}</DataLabel>
        <h2 id={`participation-${tracker.facilityId}-${planning ? 'planning' : 'live'}`}>
          {planning ? `${scheduledForWindow} scheduled for this time` : `${tracker.campusFitCheckIns} checked in with CampusFit`}
        </h2>
        <p>{planning ? `${windowLabel} arrival window` : 'Anonymous, voluntary CampusFit check-ins—not total gym occupancy.'}</p>
      </div>
      {planning ? <CalendarClock aria-hidden="true" /> : <span className="participation-tracker__live"><span className="live-beacon" aria-hidden="true" />Live</span>}
    </header>

    {planning ? <div className="participation-tracker__planning-stats">
      <div><CalendarClock aria-hidden="true" /><span><strong>{scheduledForWindow}</strong><small>{includeDraftPlan ? 'scheduled after you save' : 'scheduled in this window'}</small></span></div>
      <div><UsersRound aria-hidden="true" /><span><strong>{tracker.typicalVisitorRange[0]}–{tracker.typicalVisitorRange[1]}</strong><small>usually expected at this time</small></span></div>
    </div> : <div className="participation-tracker__live-grid">
      <div className="participation-tracker__total"><UsersRound aria-hidden="true" /><span><strong>{tracker.campusFitCheckIns}</strong><small>current CampusFit check-ins</small></span></div>
      <div><CalendarClock aria-hidden="true" /><span><strong>{tracker.plannedCheckIns}</strong><small>arrived from schedules</small></span></div>
      <div><LogIn aria-hidden="true" /><span><strong>{tracker.walkInCheckIns}</strong><small>walk-in check-ins</small></span></div>
      <div><Clock3 aria-hidden="true" /><span><strong>{tracker.scheduledNotCheckedIn}</strong><small>scheduled, not here yet · {windowLabel}</small></span></div>
    </div>}

    <footer className="participation-tracker__footer">
      <DataSourceLabel>Updated {formatTime(tracker.updatedAt, timezone)} · {tracker.confidence} confidence</DataSourceLabel>
      <StatusPill level={tracker.confidence}>{tracker.confidence} confidence</StatusPill>
    </footer>
    <details><summary>How these numbers are calculated</summary><p>{tracker.sourceExplanation}</p></details>
  </section>;
}
