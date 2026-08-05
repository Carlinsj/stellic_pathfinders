import { ArrowRight, Clock3, Dumbbell, MapPin, Sparkles, UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { DemoState, FacilityRecommendation } from '../domain/types';
import { crowdLabel } from '../lib/format';
import { getLiveAggregate } from '../services/liveAggregation';
import { DataSourceLabel, StatusPill } from './ui';

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
      <div className="gym-recommendation-heading"><div><h2>{recommendation.facility.shortName}</h2><p><MapPin />{recommendation.facility.travelMinutes} min away</p></div><StatusPill level={recommendation.eligible ? recommendation.forecast.crowdLevel : 'unknown'}>{recommendation.eligible ? crowdLabel(recommendation.forecast.crowdLevel) : 'Unavailable'}</StatusPill></div>
      <p className="gym-ranking-reason"><Sparkles />{recommendation.explanation}</p>
      <div className="gym-comparison-metrics">
        <span><UsersRound /><strong>{aggregate.campusFitCheckIns}</strong><small>CampusFit check-ins</small></span>
        <span><Clock3 /><strong>{recommendation.duration.durationRange[0]}–{recommendation.duration.durationRange[1]} min</strong><small>Estimated workout</small></span>
        <span><Dumbbell /><strong>{topDemand ? crowdLabel(topDemand.demandLevel) : 'Unknown'}</strong><small>{topDemand?.displayName ?? 'Equipment demand'}</small></span>
      </div>
      <DataSourceLabel>CampusFit prediction · {recommendation.forecast.expectedRange[0]}–{recommendation.forecast.expectedRange[1]} range · {recommendation.forecast.confidence} confidence</DataSourceLabel>
    </div>
    <Link className="gym-card-action" to={`/${tenant}/facilities/${recommendation.facility.id}`}>See details <ArrowRight /></Link>
  </article>;
}
