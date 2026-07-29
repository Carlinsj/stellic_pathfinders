import {
  ArrowRight,
  Bolt,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Play,
  RefreshCcw,
  UserRoundCheck,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader, StatusBadge } from "../components/ui";
import { roomChangeInputSchema } from "../domain/validation";
import { useDemo } from "../state/DemoContext";
import { roomForTenant } from "../tenancy/tenantConfigs";

export function SimulatorPage() {
  const { hasRun, result, runDemo, resetDemo, effectiveAt, tenant } = useDemo();
  const scenario = tenant.scenario;
  const original = roomForTenant(tenant, scenario.originalRoomId);
  const replacement = roomForTenant(tenant, scenario.replacementRoomId);
  const recommended = roomForTenant(tenant, scenario.recommendedRoomId);
  const [selectedRoom, setSelectedRoom] = useState(hasRun ? replacement.id : original.id);
  const [effective, setEffective] = useState(effectiveAt.slice(0, 16));
  const [formError, setFormError] = useState("");

  const trigger = () => {
    const parsed = roomChangeInputSchema.safeParse({
      sectionId: scenario.course.id,
      previousRoomId: original.id,
      newRoomId: replacement.id,
      effectiveAt: new Date(effective).toISOString(),
      reason: "Instructor-requested room update",
    });
    if (!parsed.success) {
      setFormError("Choose a valid effective date and time.");
      return;
    }
    setFormError("");
    setSelectedRoom(parsed.data.newRoomId);
    runDemo(parsed.data.effectiveAt);
  };

  const reset = () => {
    resetDemo();
    setSelectedRoom(original.id);
  };

  return (
    <div className="page simulator-page">
      <PageHeader
        eyebrow={`${tenant.shortName.toUpperCase()} ADMINISTRATIVE ROOM-CHANGE SIMULATOR`}
        title="See access continuity checks happen live"
        description={`This ${tenant.shortName} scenario is synthetic, deterministic, and powered by the same shared engine as every tenant.`}
        actions={<button className="button button-secondary" type="button" onClick={reset}><RefreshCcw size={16} /> Reset demo</button>}
      />

      <div className="simulator-grid">
        <section className="simulator-control">
          <div className="competition-label"><Bolt size={16} /> {tenant.shortName.toUpperCase()} COMPETITION SCENARIO</div>
          <h2>Move {scenario.course.courseCode} from {original.roomNumber} to {replacement.roomNumber}</h2>
          <p>The replacement looks plausible, but the tenant catalogue exposes {tenant.slug === "nyu" ? "four unavailable features" : "two unavailable features and one verification gap"}.</p>
          <div className="simulator-form">
            <label><span>Course section</span><select defaultValue={scenario.course.id}><option value={scenario.course.id}>{scenario.course.courseCode} · {scenario.course.title}</option></select></label>
            <div className="room-change-fields">
              <label><span>Current room</span><select value={original.id} disabled><option value={original.id}>{original.roomNumber} · Ready</option></select></label>
              <ChevronRight aria-hidden="true" />
              <label><span>New room</span><select value={selectedRoom} onChange={(event) => setSelectedRoom(event.target.value)}>
                <option value={original.id}>{original.roomNumber} · Ready</option>
                <option value={replacement.id}>{replacement.roomNumber} · Demo scenario</option>
                <option value={recommended.id}>{recommended.roomNumber} · Ready</option>
              </select></label>
            </div>
            <label><span>Effective date and time</span><div className="input-icon"><CalendarClock size={17} /><input type="datetime-local" value={effective} onChange={(event) => setEffective(event.target.value)} /></div></label>
            {formError && <p className="form-error" role="alert">{formError}</p>}
          </div>
          <button className="run-demo-button" type="button" onClick={trigger}>
            <span><Play fill="currentColor" size={19} /></span>
            <span><strong>Run {tenant.shortName} competition demo</strong><small>Trigger room change and evaluate affected students</small></span>
            <ArrowRight size={20} />
          </button>
          <p className="demo-disclaimer">No external integrations, medical data, or AI decision-making are required.</p>
        </section>

        <section className={`live-result${hasRun ? " active" : ""}`} aria-live="polite">
          {!hasRun || !result ? (
            <div className="waiting-state">
              <span className="waiting-icon"><Bolt /></span><p className="eyebrow">LIVE WORKFLOW</p><h2>Ready for the room change</h2>
              <p>Run the scenario to see {tenant.terminology.accessibilityOfficeShort}, room checks, alternatives, and notifications update here.</p>
              <ol><li><span>1</span>Detect change</li><li><span>2</span>Check requirements</li><li><span>3</span>Start tenant workflow</li></ol>
            </div>
          ) : (
            <div className="result-active">
              <div className="live-result-top"><div><p className="eyebrow">WORKFLOW STARTED · DETERMINISTIC</p><h2>{replacement.roomNumber} needs action</h2></div><StatusBadge status={result.compatibility.status} /></div>
              <div className="workflow-steps">
                {tenant.workflow.steps.slice(0, 4).map((step, index) => (
                  <div key={step.id}><span><CheckCircle2 /></span><p><strong>{step.label}</strong><small>{index === 0 ? `${original.roomNumber} → ${replacement.roomNumber}` : step.ownerRole.replaceAll("_", " ")}</small></p></div>
                ))}
              </div>
              <div className="impact-panel">
                <div><span className="avatar maya">{scenario.student.fullName.split(" ").map((part) => part[0]).join("")}</span><span><strong>{scenario.student.fullName}</strong><small>{scenario.course.courseCode} · Enrolled student</small></span></div>
                <div className="impact-stats"><span><Users size={16} /><strong>1</strong> affected</span><span><UserRoundCheck size={16} /><strong>{scenario.requirements.length}</strong> checked</span></div>
              </div>
              <div className="best-alternative">
                <p className="eyebrow">BEST COMPATIBLE ALTERNATIVE</p>
                <div><span className="room-number-large">{recommended.roomNumber}</span><span><strong>{recommended.roomNumber}</strong><small>Available · {recommended.capacity} seats · Verified</small></span><StatusBadge status="compatible" compact /></div>
              </div>
              <div className="result-links">
                <Link className="button button-primary" to={`/${tenant.slug}/student/alert`}>Open room-change alert <ArrowRight size={16} /></Link>
                <Link className="text-link" to={`/${tenant.slug}/admin/notifications`}>Preview messages <ArrowRight size={16} /></Link>
              </div>
            </div>
          )}
        </section>
      </div>

      <section className="simulator-assurance">
        <span><CheckCircle2 /> Same engine, tenant configuration</span>
        <span><CheckCircle2 /> Workflow snapshot v{tenant.workflow.version}</span>
        <span><CheckCircle2 /> Synthetic student data</span>
        <span><CheckCircle2 /> Staff confirmation required</span>
      </section>
    </div>
  );
}
