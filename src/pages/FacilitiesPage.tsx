import { ArrowRight, CheckCircle2, Clock3, GitCompareArrows, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { FacilityCard } from '../components/FacilityCard';
import { DataLabel } from '../components/ui';
import { useTenant } from '../data/TenantContext';
import { recommendFacilities } from '../services/recommendation';

export function FacilitiesPage() {
  const { tenant, state } = useTenant();
  const recommendations = recommendFacilities(state, state.now, 'general_workout', undefined, 60);
  const best = recommendations.find((item) => item.eligible)!;
  return <div className="page-stack facilities-page">
    <header className="page-header"><div><DataLabel>{state.university.shortName} facilities</DataLabel><h1>Every gym, one clear view.</h1><p>Compare live participation, predicted crowding, equipment pressure, and travel time.</p></div><Link className="button button--primary button--medium" to={`/${tenant}/plan`}><GitCompareArrows size={18} /> Compare for my workout</Link></header>
    <section className="best-banner"><span><Sparkles /></span><div><DataLabel>Best overall right now</DataLabel><h2>{best.facility.shortName}</h2><p>{best.explanation}</p></div><div><strong>{best.score}</strong><small>fit score</small></div><Link to={`/${tenant}/facilities/${best.facility.id}`}>See why <ArrowRight size={16} /></Link></section>
    <div className="facility-grid facility-grid--full">{state.facilities.map((facility) => <FacilityCard key={facility.id} state={state} facility={facility} tenant={tenant} />)}</div>
    <section className="method-card"><div><DataLabel>How comparisons work</DataLabel><h2>Specific to your plan, honest about the data.</h2></div><ul><li><CheckCircle2 /> Required activities and equipment first</li><li><CheckCircle2 /> Facility hours and operational supply</li><li><CheckCircle2 /> Workout-specific queue estimates</li><li><Clock3 /> Forecast confidence and freshness</li></ul></section>
  </div>;
}
