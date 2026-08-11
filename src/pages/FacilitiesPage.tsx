import { ArrowRight, Building2, CheckCircle2, Clock3, GitCompareArrows, Sparkles, UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { GymRecommendationCard } from '../components/GymRecommendationCard';
import { DataLabel, SectionHeader } from '../components/ui';
import { useTenant } from '../data/TenantContext';
import { isFacilityOpen } from '../services/forecasting';
import { getLiveAggregate } from '../services/liveAggregation';
import { recommendFacilities } from '../services/recommendation';

export function FacilitiesPage() {
  const { tenant, state } = useTenant();
  const recommendations = recommendFacilities(state, state.now, 'general_workout', undefined, 60);
  const best = recommendations.find((item) => item.eligible)!;
  const openFacilities = state.facilities.filter((facility) => isFacilityOpen(facility, state.now)).length;
  const campusFitCheckIns = state.facilities.reduce((total, facility) => total + getLiveAggregate(state, facility.id).campusFitCheckIns, 0);
  return <div className="page-stack facilities-page">
    <header className="page-header"><div><DataLabel>{state.university.shortName} facilities</DataLabel><h1>Every gym, one clear view.</h1><p>Compare live participation, predicted crowding, equipment pressure, and travel time.</p></div><Link className="button button--primary button--medium" to={`/${tenant}/plan`}><GitCompareArrows size={18} /> Compare for my workout</Link></header>
    <section className="facility-overview" aria-label="Facility overview">
      <article><span><Building2 aria-hidden="true" /></span><div><strong>{openFacilities} of {state.facilities.length}</strong><small>facilities open now</small></div></article>
      <article><span><UsersRound aria-hidden="true" /></span><div><strong>{campusFitCheckIns}</strong><small>voluntary CampusFit check-ins</small></div></article>
      <article><span><Sparkles aria-hidden="true" /></span><div><strong>{best.facility.shortName}</strong><small>best overall fit right now</small></div></article>
    </section>
    <section className="best-banner"><span><Sparkles /></span><div><DataLabel>Best overall right now</DataLabel><h2>{best.facility.shortName}</h2><p>{best.explanation}</p></div><div><strong>{best.score}</strong><small>fit score</small></div><Link to={`/${tenant}/facilities/${best.facility.id}`}>See why <ArrowRight size={16} /></Link></section>
    <section aria-labelledby="facility-list-title"><SectionHeader eyebrow="All facilities" title="Compare your options" titleId="facility-list-title" description="Ranked for a general workout using travel, hours, equipment, and CampusFit demand predictions." /><div className="gym-comparison-list" aria-label="Ranked NYU gyms">{recommendations.map((recommendation, index) => <GymRecommendationCard key={recommendation.facility.id} state={state} tenant={tenant} recommendation={recommendation} index={index} />)}</div></section>
    <section className="method-card"><div><DataLabel>How comparisons work</DataLabel><h2>Specific to your plan, honest about the data.</h2></div><ul><li><CheckCircle2 /> Required activities and equipment first</li><li><CheckCircle2 /> Facility hours and operational supply</li><li><CheckCircle2 /> Workout-specific queue estimates</li><li><Clock3 /> Forecast confidence and freshness</li></ul></section>
  </div>;
}
