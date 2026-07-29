import {
  ArrowRight,
  CheckCircle2,
  Circle,
  Clock3,
  LockKeyhole,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";
import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { PageHeader, StatusBadge } from "../components/ui";
import { useDemo } from "../state/DemoContext";
import { roomForTenant } from "../tenancy/tenantConfigs";

export function CasePage() {
  const {
    hasRun,
    runDemo,
    tenant,
    caseState,
    updateCase,
    workflowInstance,
    completeWorkflowStep,
  } = useDemo();
  const location = useLocation();
  const isStudent = location.pathname.includes("/student/");

  useEffect(() => {
    if (!hasRun) runDemo();
  }, [hasRun, runDemo]);

  const scenario = tenant.scenario;
  const proposed = roomForTenant(tenant, scenario.recommendedRoomId);
  const status = caseState?.status ?? "open";

  const resolve = () => {
    updateCase({
      status: "resolved",
      resolution: `Move ${scenario.course.courseCode} to ${proposed.roomNumber}`,
      resolvedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="page">
      <PageHeader
        eyebrow={`${tenant.shortName.toUpperCase()} · ${tenant.terminology.caseLabel.toUpperCase()} ${scenario.caseId}`}
        title={status === "resolved" ? "Compatible room confirmed" : "Coordinate the room resolution"}
        description={`This case uses a frozen snapshot of ${tenant.workflow.name}, version ${workflowInstance?.definitionVersion ?? tenant.workflow.version}.`}
        actions={<StatusBadge status={status} />}
      />

      <div className="case-grid">
        <section className="case-main">
          <div className="case-summary-bar">
            <span><strong>{scenario.course.courseCode}</strong><small>{scenario.course.title}</small></span>
            <ArrowRight size={16} />
            <span><strong>{roomForTenant(tenant, scenario.replacementRoomId).roomNumber}</strong><small>Needs action</small></span>
            <ArrowRight size={16} />
            <span><strong>{proposed.roomNumber}</strong><small>Recommended</small></span>
          </div>

          <section className="timeline-card">
            <div className="section-heading-row"><div><p className="eyebrow">TENANT WORKFLOW</p><h2>{tenant.workflow.name}</h2></div><span className="version-chip">Snapshot v{workflowInstance?.definitionVersion ?? tenant.workflow.version}</span></div>
            <ol className="workflow-timeline">
              {(workflowInstance?.steps ?? tenant.workflow.steps.map((step, index) => ({
                stepId: step.id,
                label: step.label,
                status: index === 0 ? "active" as const : "pending" as const,
              }))).map((step, index) => (
                <li key={step.stepId} className={`workflow-${step.status}`}>
                  <span>{step.status === "completed" || status === "resolved" ? <CheckCircle2 /> : step.status === "active" ? <Clock3 /> : <Circle />}</span>
                  <div><strong>{index + 1}. {step.label}</strong><small>{step.status === "active" ? "Current step" : step.status}</small></div>
                </li>
              ))}
            </ol>
            {!isStudent && status !== "resolved" && (
              <button className="button button-secondary" type="button" onClick={completeWorkflowStep}>
                <UserRoundCheck size={16} /> Complete active step
              </button>
            )}
          </section>

          <section className="resolution-card">
            <span className="resolution-icon"><ShieldCheck /></span>
            <div><p className="eyebrow">RECOMMENDED RESOLUTION</p><h2>Assign {proposed.roomNumber}</h2><p>All {scenario.requirements.length} active requirements pass. Scheduling, capacity, and inventory are tenant-scoped.</p></div>
            {!isStudent && status !== "resolved" ? (
              <button className="button button-primary" type="button" onClick={resolve}>Confirm &amp; resolve <CheckCircle2 size={16} /></button>
            ) : (
              <StatusBadge status="resolved" />
            )}
          </section>
        </section>

        <aside className="case-aside">
          <section className="summary-card">
            <p className="eyebrow">OWNERSHIP</p>
            <dl className="case-details-list">
              <div><dt>Current owner</dt><dd>{tenant.terminology.accessibilityOfficeShort}</dd></div>
              <div><dt>Scheduling</dt><dd>{tenant.terminology.schedulingOffice}</dd></div>
              <div><dt>Workflow version</dt><dd>{workflowInstance?.definitionVersion ?? tenant.workflow.version}</dd></div>
              <div><dt>Tenant</dt><dd>{tenant.shortName}</dd></div>
            </dl>
          </section>
          <section className="summary-card">
            <p className="eyebrow">PRIVACY BOUNDARY</p>
            <p className="private-note"><LockKeyhole size={15} /> Instructors see only the operational notice. The feature checklist stays with authorised staff and the student.</p>
            <Link className="text-link" to={`/${tenant.slug}/admin/notifications`}>Preview role messages <ArrowRight size={15} /></Link>
          </section>
          <section className="summary-card">
            <p className="eyebrow">DEMO RECORDS</p>
            <div className="case-mini"><span className="case-mini-icon"><Clock3 size={18} /></span><span><strong>{scenario.openCaseLabel}</strong><small>Open · synthetic</small></span></div>
            <div className="case-mini"><span className="case-mini-icon"><CheckCircle2 size={18} /></span><span><strong>{scenario.completedCaseLabel}</strong><small>Completed · synthetic</small></span></div>
          </section>
        </aside>
      </div>
    </div>
  );
}
