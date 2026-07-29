import { ArrowRight, Building2, GraduationCap, Settings2, ShieldCheck } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { useDemo } from "../state/DemoContext";
import { useTenant } from "../tenancy/TenantContext";

export function TenantLandingPage() {
  const { tenant } = useDemo();
  const { resolution } = useTenant();
  if (resolution.status === "not_found" || resolution.status === "blocked") {
    return <Navigate to="/" replace />;
  }
  return (
    <div className="tenant-entry">
      <header>
        <Link className="brand" to="/"><span className="brand-mark">R</span><span>RoomReady</span></Link>
        <span className="synthetic-chip">Synthetic competition workspace</span>
      </header>
      <main>
        <section className="tenant-entry-hero">
          <span className="tenant-entry-logo" aria-label={`${tenant.name} text logo`}>{tenant.logoText}</span>
          <p className="eyebrow">CONFIGURED UNIVERSITY WORKSPACE</p>
          <h1>{tenant.name}</h1>
          <p>{tenant.terminology.accessibilityOffice} · {tenant.terminology.schedulingOffice}</p>
          <div className="tenant-entry-actions">
            <Link className="button button-primary button-large" to={`/${tenant.slug}/student`}><GraduationCap size={18} /> Student demo <ArrowRight size={18} /></Link>
            <Link className="button button-secondary button-large" to={`/${tenant.slug}/admin`}><Building2 size={18} /> Administrator demo</Link>
          </div>
        </section>
        <section className="tenant-entry-grid">
          <article><ShieldCheck /><strong>{tenant.featureCatalogue.length} feature definitions</strong><span>Tenant labels mapped to stable concepts</span></article>
          <article><Settings2 /><strong>{tenant.workflow.name}</strong><span>Version {tenant.workflow.version} · {tenant.workflow.steps.length} ordered steps</span></article>
          <article><Building2 /><strong>{tenant.scenario.rooms.length} synthetic rooms</strong><span>{tenant.scenario.buildings.length} synthetic buildings</span></article>
        </section>
        <p className="tenant-entry-disclosure">{tenant.syntheticDataNotice}</p>
      </main>
    </div>
  );
}
