import { ArrowUpRight, Clock3, Dumbbell, MapPin, UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { DemoState, Facility } from '../domain/types';
import { getLiveAggregate } from '../services/liveAggregation';
import { forecastDemand } from '../services/forecasting';
import { calculateEquipmentDemand } from '../services/equipmentDemand';
import { campusFitCheckInText, crowdLabel, formatTime } from '../lib/format';
import { titleCase } from '../data/catalog';
import { FacilityActivityList, FacilityAvailability } from './FacilityPresentation';
import { DataSourceLabel, ForecastEstimate, StatusPill } from './ui';
import { getFacilityParticipationTracker } from '../services/participationTracker';

export function FacilityCard({ state, facility, tenant, compact = false }: { state: DemoState; facility: Facility; tenant: string; compact?: boolean }) {
  if (compact) {
    const participation = getFacilityParticipationTracker(state, facility.id);
    return <article className="facility-card facility-card--compact facility-checkin-card">
      <div className="facility-card__top"><div className="facility-monogram" aria-hidden="true">{facility.shortName.slice(0, 2).toUpperCase()}</div><FacilityAvailability facility={facility} at={state.now} /></div>
      <div className="facility-card__content"><p className="eyebrow"><MapPin size={13} />{facility.travelMinutes} min away · {facility.address}</p><h3>{facility.shortName}</h3></div>
      <div className="facility-checkin-count" aria-live="polite" aria-atomic="true"><UsersRound aria-hidden="true" /><span><strong>{participation.campusFitCheckIns}</strong><small>{participation.campusFitCheckIns === 1 ? 'person currently checked in' : 'people currently checked in'}</small></span></div>
      <p className="facility-checkin-note">Anonymous, voluntary CampusFit participation—not total gym occupancy.</p>
      <FacilityActivityList activityKeys={facility.activities} limit={3} />
      <DataSourceLabel>Updated {formatTime(participation.updatedAt, state.university.timezone)} · CampusFit check-ins only</DataSourceLabel>
      <Link className="card-link" to={`/${tenant}/facilities/${facility.id}`}>View anonymous details and plan <ArrowUpRight size={17} /></Link>
    </article>;
  }
  const aggregate = getLiveAggregate(state, facility.id);
  const forecast = forecastDemand(state, facility.id, state.now);
  const laterAt = new Date(Date.parse(state.now) + 90 * 60_000).toISOString();
  const laterForecast = forecastDemand(state, facility.id, laterAt);
  const demand = calculateEquipmentDemand(state, facility.id, state.now, 'general_workout');
  const busyEquipment = demand.find((item) => item.demandLevel === 'very_high') ?? demand.find((item) => item.demandLevel === 'high') ?? demand[0];
  const notableActivity = facility.activities[0] ? titleCase(facility.activities[0]) : 'Strength & cardio';
  const bestTime = laterForecast.crowdLevel === 'low' || (forecast.crowdLevel === 'busy' && laterForecast.crowdLevel === 'moderate')
    ? formatTime(laterAt, state.university.timezone)
    : 'Now';
  return <article className="facility-card">
    <div className="facility-card__top"><div className="facility-monogram" aria-hidden="true">{facility.shortName.slice(0, 2).toUpperCase()}</div><FacilityAvailability facility={facility} at={state.now} /></div>
    <div className="facility-card__content"><p className="eyebrow"><MapPin size={13} />{facility.travelMinutes} min away · {facility.address}</p><h3>{facility.shortName}</h3><p>{facility.description}</p><div className="facility-card__status"><StatusPill level={forecast.crowdLevel}>{crowdLabel(forecast.crowdLevel)} expected</StatusPill><span><UsersRound />{campusFitCheckInText(aggregate.campusFitCheckIns)}</span></div></div>
    <FacilityActivityList activityKeys={facility.activities} limit={5} />
    <div className="facility-insights"><span><Dumbbell />{notableActivity}</span><span><Clock3 />Best time: {bestTime}</span></div>
    <p className="facility-demand-note"><strong>{busyEquipment ? `${crowdLabel(busyEquipment.demandLevel)} ${busyEquipment.displayName.toLowerCase()} demand` : 'Equipment demand unknown'}</strong><span>{busyEquipment ? `${busyEquipment.queueRange[0]}–${busyEquipment.queueRange[1]} min likely wait` : 'Official equipment sensors unavailable'}</span></p>
    <ForecastEstimate forecast={forecast} compact />
    <Link className="card-link" to={`/${tenant}/facilities/${facility.id}`}>View {facility.shortName} details <ArrowUpRight size={17} /></Link>
  </article>;
}
