import {
  ArrowRight,
  BellRing,
  CheckCircle2,
  Route,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import { allTenantConfigs } from "../tenancy/tenantConfigs";

export function LandingPage() {
  return (
    <div className="landing">
      <header className="landing-nav">
        <Link className="brand" to="/"><span className="brand-mark">R</span><span>RoomReady</span></Link>
        <nav aria-label="Public navigation">
          <a href="#campuses">Campus configurations</a>
          <a href="#how-it-works">How it works</a>
          <Link className="button button-small button-dark" to="/nyu/student">Launch student demo <ArrowRight size={16} /></Link>
        </nav>
      </header>
      <main>
        <section className="hero platform-hero">
          <div className="hero-copy">
            <p className="eyebrow"><span className="live-dot" /> Multi-university access continuity</p>
            <h1>Room changes can silently break approved classroom arrangements.</h1>
            <p className="hero-lede">RoomReady catches that break before class begins—without copying the product, the engine, or private data from campus to campus.</p>
            <h2>One compatibility engine, configured for every campus.</h2>
            <div className="hero-actions">
              <Link className="button button-primary button-large" to="/nyu/student">Open student demo <ArrowRight size={18} /></Link>
              <Link className="text-link" to="/uiuc/admin/setup">University administrator setup <ArrowRight size={16} /></Link>
            </div>
            <div className="trust-line"><ShieldCheck size={18} /><span>Functional requirements only</span><span aria-hidden="true">·</span><span>Strict tenant boundaries</span></div>
          </div>
          <div className="tenant-preview-stack" aria-label="Preview of two independently configured university experiences">
            {allTenantConfigs.map((tenant) => (
              <article
                key={tenant.id}
                className="tenant-preview-card"
                style={{ "--preview-primary": tenant.theme.primaryColour, "--preview-accent": tenant.theme.secondaryColour } as React.CSSProperties}
              >
                <div className="tenant-preview-brand"><span>{tenant.logoText}</span><div><strong>{tenant.name}</strong><small>{tenant.terminology.accessibilityOfficeShort}</small></div></div>
                <div className="tenant-preview-scenario"><span className="course-chip">{tenant.scenario.course.courseCode}</span><strong>{tenant.scenario.student.fullName}</strong><small>{tenant.scenario.rooms.find((room) => room.id === tenant.scenario.originalRoomId)?.roomNumber} → {tenant.scenario.rooms.find((room) => room.id === tenant.scenario.replacementRoomId)?.roomNumber}</small></div>
                <div className="recommendation-strip"><span className="recommendation-icon"><Sparkles size={18} /></span><span><small>COMPATIBLE ALTERNATIVE</small><strong>{tenant.scenario.rooms.find((room) => room.id === tenant.scenario.recommendedRoomId)?.roomNumber}</strong></span><ArrowRight size={18} /></div>
              </article>
            ))}
          </div>
        </section>

        <section className="proof-strip" aria-label="Platform principles">
          <span><strong>1</strong> deterministic engine</span>
          <span><strong>2</strong> complete demo tenants</span>
          <span><strong>0</strong> diagnosis fields</span>
          <span><strong>100%</strong> synthetic demo data</span>
        </section>

        <section className="landing-section" id="campuses">
          <div className="section-intro"><p className="eyebrow">CAMPUS CONFIGURATION, NOT CODE FORKS</p><h2>Each university controls its rooms, words, colours, offices, templates, and workflow.</h2></div>
          <div className="campus-card-grid">
            {allTenantConfigs.map((tenant) => (
              <article key={tenant.id} className="campus-card">
                <span className="tenant-logo-text" style={{ background: tenant.theme.primaryColour }}>{tenant.logoText}</span>
                <h3>{tenant.name}</h3>
                <p>{tenant.featureCatalogue.length} configured feature labels · workflow v{tenant.workflow.version} · {tenant.timezone}</p>
                <div><Link className="button button-secondary" to={`/${tenant.slug}/student`}>{tenant.shortName} student <ArrowRight size={15} /></Link><Link className="text-link" to={`/${tenant.slug}/admin`}>{tenant.shortName} admin <ArrowRight size={15} /></Link></div>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-section problem-section" id="how-it-works">
          <div className="section-intro"><p className="eyebrow">ONE SHARED RESPONSE LOOP</p><h2>Tenant-specific inputs. Consistent safety gates. Local ownership.</h2></div>
          <div className="problem-grid">
            <article><span className="card-icon"><BellRing /></span><h3>Detect the change</h3><p>A tenant-scoped scheduling event identifies affected enrolments without crossing university boundaries.</p></article>
            <article><span className="card-icon"><ShieldCheck /></span><h3>Apply hard gates</h3><p>The same deterministic engine compares stable feature concepts—not campus presentation labels.</p></article>
            <article><span className="card-icon"><Route /></span><h3>Run the local workflow</h3><p>Versioned steps, office terminology, and notifications follow each university’s published configuration.</p></article>
          </div>
        </section>

        <section className="landing-cta">
          <span className="cta-icon"><CheckCircle2 /></span>
          <h2>See one platform adapt to two campuses in under three minutes.</h2>
          <p>All student, room, course, and university records shown here are synthetic. No adoption or endorsement is implied.</p>
          <Link className="button button-primary button-large" to="/nyu/student">Start with NYU <ArrowRight size={18} /></Link>
        </section>
      </main>
      <footer className="landing-footer"><Link className="brand" to="/"><span className="brand-mark">R</span><span>RoomReady</span></Link><p>Competition prototype · Synthetic data only · Operational checks, not legal determinations</p></footer>
    </div>
  );
}
