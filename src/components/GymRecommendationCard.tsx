import { ArrowRight, Clock3, Dumbbell, MapPin, Sparkles, UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { DemoState, FacilityRecommendation } from '../domain/types';
import { crowdLabel } from '../lib/format';
import { getLiveAggregate } from '../services/liveAggregation';
import { ForecastEstimate, StatusPill } from './ui';
import { FacilityActivityList, FacilityAvailability } from './FacilityPresentation';

const rankingLabel = (recommendation: FacilityRecommendation, index: number): string => {
  if (!recommendation.eligible) return 'Not recommended';
  if (index === 0) return 'Best fit';
  if (index === 1) return 'Good alternative';
  return 'Less suitable';
};

export function GymRecommendationCard({ state, tenant, recommendation, index }: { state: DemoState; tenant: string; recommendation: FacilityRecommendation; index: number }) {
  const aggregate = getLiveAggregate(state, recommendation.facility.id);
  const topDemand = recommendation.equipmentDemand[0];
  const label = rankingLabel(recommendation, index);

  return <article className={`gym-recommendation-card ${!recommendation.eligible ? 'gym-recommendation-card--disabled' : ''}`}>
    <div className="gym-rank"><span>{index + 1}</span><strong>{label}</strong></div>
    <div className="gym-recommendation-main">
      <div className="gym-recommendation-heading"><div><h2>{recommendation.facility.shortName}</h2><p><MapPin />{recommendation.facility.travelMinutes} min away · {recommendation.facility.address}</p></div><StatusPill level={recommendation.eligible ? recommendation.forecast.crowdLevel : 'unknown'}>{recommendation.eligible ? `${crowdLabel(recommendation.forecast.crowdLevel)} expected` : 'Unavailable'}</StatusPill></div>
      <FacilityAvailability facility={recommendation.facility} at={state.now} />
      <p className="gym-ranking-reason"><Sparkles />{recommendation.explanation}</p>
      <FacilityActivityList activityKeys={recommendation.facility.activities} />
      <div className="gym-comparison-metrics">
        <span><UsersRound /><strong>{aggregate.campusFitCheckIns}</strong><small>CampusFit check-ins</small></span>
        <span><Clock3 /><strong>{recommendation.duration.durationRange[0]}–{recommendation.duration.durationRange[1]} min</strong><small>Estimated workout</small></span>
        <span><Dumbbell /><strong>{topDemand ? crowdLabel(topDemand.demandLevel) : 'Unknown'}</strong><small>{topDemand?.displayName ?? 'Equipment demand'}</small></span>
      </div>
      <ForecastEstimate forecast={recommendation.forecast} compact />
    </div>
    <Link className="gym-card-action" to={`/${tenant}/facilities/${recommendation.facility.id}`}>View details <ArrowRight /></Link>
  </article>;
}
