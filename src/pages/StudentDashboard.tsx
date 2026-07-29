import {
  ArrowRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  Clock3,
  LockKeyhole,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader, StatusBadge } from "../components/ui";
import { useDemo } from "../state/DemoContext";
import { roomForTenant } from "../tenancy/tenantConfigs";

export function StudentDashboard() {
  const { hasRun, result, tenant, assignmentRoomId } = useDemo();
  const { scenario } = tenant;
  const currentRoom = roomForTenant(tenant, assignmentRoomId);
  const building = scenario.buildings.find((item) => item.id === currentRoom.buildingId);
  const firstName = scenario.student.fullName.split(" ")[0];
  const labelMap = Object.fromEntries(
    tenant.featureCatalogue.map((feature) => [feature.key, feature.displayName]),
  );

  return (
    <div className="page">
      <PageHeader
        eyebrow={`${tenant.shortName.toUpperCase()} STUDENT VIEW · ${tenant.timezone}`}
        title={`Good morning, ${firstName}.`}
        description={`Here’s the readiness status for your upcoming classes, coordinated with ${tenant.terminology.accessibilityOfficeShort}.`}
        actions={<span className="privacy-chip"><LockKeyhole size={15} /> Private to you and authorised {tenant.shortName} staff</span>}
      />

      {hasRun && result ? (
        <section className="alert-banner" aria-live="polite">
          <span className="alert-banner-icon"><Bell aria-hidden="true" /></span>
          <div>
            <p className="eyebrow">ROOM CHANGE DETECTED</p>
            <h2>Your {scenario.course.title} classroom needs review</h2>
            <p>
              {currentRoom.roomNumber} is missing {result.compatibility.failed.length} of your
              approved classroom features. A compatible alternative has already been identified.
            </p>
          </div>
          <Link className="button button-dark" to={`/${tenant.slug}/student/alert`}>View update <ArrowRight size={16} /></Link>
        </section>
      ) : (
        <section className="calm-banner">
          <span><CheckCircle2 aria-hidden="true" /></span>
          <div><strong>All upcoming classrooms are ready</strong><p>We’ll let you know if a room assignment changes.</p></div>
        </section>
      )}

      <div className="dashboard-grid">
        <section>
          <div className="section-heading-row">
            <div><p className="eyebrow">UPCOMING</p><h2>Classes</h2></div>
            <span className="muted-text">Tenant-scoped schedule</span>
          </div>
          <div className="class-card featured">
            <div className="class-time"><strong>{scenario.course.startTime.split(" ")[0]}</strong><span>{scenario.course.startTime.split(" ")[1]}</span><small>80 min</small></div>
            <div className="class-content">
              <div className="class-topline"><span className="course-chip">{scenario.course.courseCode}</span><StatusBadge status={result?.compatibility.status ?? "compatible"} /></div>
              <h3>{scenario.course.title}</h3>
              <p><CalendarDays size={15} /> {scenario.course.meetingDays}, {scenario.course.startTime}–{scenario.course.endTime}</p>
              <p><MapPin size={15} /> {building?.name} · {currentRoom.roomNumber}</p>
              <div className="class-feature-summary">
                <span><ShieldCheck size={16} /> {hasRun ? `${scenario.requirements.length} requirements checked · ${result?.compatibility.failed.length ?? 0} need action` : `${scenario.requirements.length} approved features carried forward`}</span>
                {hasRun && <Link to={`/${tenant.slug}/student/alert`}>Review details <ArrowRight size={15} /></Link>}
              </div>
            </div>
          </div>
          <div className="class-card">
            <div className="class-time"><strong>5:00</strong><span>PM</span><small>50 min</small></div>
            <div className="class-content">
              <div className="class-topline"><span className="course-chip muted">{tenant.slug === "nyu" ? "CS-GY 6903" : "MATH 257"}</span><StatusBadge status="compatible" /></div>
              <h3>{tenant.slug === "nyu" ? "Applied Cryptography" : "Linear Algebra with Computational Applications"}</h3>
              <p><MapPin size={15} /> {scenario.buildings[1]?.name} · Demo room 401</p>
            </div>
          </div>
        </section>

        <aside className="dashboard-aside">
          <div className="summary-card">
            <p className="eyebrow">YOUR CLASSROOM FEATURES</p>
            <h2>{scenario.requirements.length} active requirements</h2>
            <ul className="feature-summary-list">
              {scenario.requirements.map((requirement) => (
                <li key={requirement.id}><CheckCircle2 size={16} />{labelMap[requirement.featureType]}</li>
              ))}
            </ul>
            <p className="private-note"><LockKeyhole size={15} /> Your full list is not shared with instructors.</p>
          </div>
          <div className="summary-card">
            <div className="section-heading-row"><p className="eyebrow">OPEN {tenant.terminology.caseLabel.toUpperCase()}S</p><span className="count-chip">{hasRun ? 1 : 0}</span></div>
            {hasRun ? (
              <Link className="case-mini" to={`/${tenant.slug}/student/case`}>
                <span className="case-mini-icon"><Clock3 size={18} /></span>
                <span><strong>{scenario.caseId} · Room review</strong><small>{tenant.terminology.accessibilityOfficeShort} · Open</small></span>
                <ArrowRight size={16} />
              </Link>
            ) : (
              <div className="empty-state-small"><CheckCircle2 size={22} /><strong>No open cases</strong><span>There’s nothing you need to do.</span></div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
