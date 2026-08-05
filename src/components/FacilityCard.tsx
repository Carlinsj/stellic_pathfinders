import { ArrowUpRight, Clock3, MapPin, UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { DemoState, Facility } from '../domain/types';
import { getLiveAggregate } from '../services/liveAggregation';
import { forecastDemand } from '../services/forecasting';
import { crowdLabel, formatTime } from '../lib/format';
import { ProgressBar, StatusPill } from './ui';

export function FacilityCard({ state, facility, tenant, compact = false }: { state: DemoState; facility: Facility; tenant: string; compact?: boolean }) {
  const aggregate = getLiveAggregate(state, facility.id);
  const forecast = forecastDemand(state, facility.id, state.now);
  const midpoint = (forecast.expectedRange[0] + forecast.expectedRange[1]) / 2;
  const pct = Math.round(midpoint / facility.capacity * 100);
  return <article className={`facility-card ${compact ? 'facility-card--compact' : ''}`}>
    <div className="facility-card__top"><div className="facility-monogram" aria-hidden="true">{facility.shortName.slice(0, 2).toUpperCase()}</div><StatusPill level={forecast.crowdLevel} /></div>
    <div className="facility-card__content"><p className="eyebrow"><MapPin size={13} />{facility.travelMinutes} min from you</p><h3>{facility.shortName}</h3><p>{facility.description}</p></div>
    <div className="facility-stats"><span><UsersRound size={16} /><strong>{aggregate.campusFitCheckIns}</strong> CampusFit check-ins</span><span><Clock3 size={16} />Forecast {formatTime(state.now, state.university.timezone)} · {crowdLabel(forecast.crowdLevel)}</span></div>
    <ProgressBar value={pct} label={`Predicted range ${forecast.expectedRange[0]}–${forecast.expectedRange[1]}`} />
    <Link className="card-link" to={`/${tenant}/facilities/${facility.id}`}>View demand details <ArrowUpRight size={17} /></Link>
  </article>;
}
