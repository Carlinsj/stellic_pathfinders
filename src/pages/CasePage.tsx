import {
  ArrowRight,
  Building2,
  CheckCircle2,
  CircleDot,
  ClipboardCheck,
  Clock3,
  UserCheck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageHeader, StatusBadge } from "../components/ui";
import { useDemo } from "../state/DemoContext";

export function CasePage() {
  const { hasRun, runDemo, caseState, updateCase } = useDemo();
  const navigate = useNavigate();
  const activeCase = caseState ?? {
    id: "RR-1042",
    compatibilityCheckId: "check-maya-815",
    status: "open" as const,
    assignedTeam: "Accessibility Operations",
    proposedRoomId: "room-812",
    createdAt: "2026-07-29T15:14:00.000Z",
  };

  const assign = () => {
    if (!hasRun) runDemo();
    updateCase({ status: "in_review", assignedTeam: "Accessibility Operations · Alex Ortiz" });
  };
  const verify = () => {
    if (!hasRun) runDemo();
    updateCase({ status: "awaiting_verification" });
  };
  const resolve = () => {
    if (!hasRun) runDemo();
    updateCase({
      status: "resolved",
      resolution: "Room 812 confirmed by authorised registrar",
      resolvedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="page">
      <PageHeader
        eyebrow={`REMEDIATION CASE · ${activeCase.id}`}
        title="Restore classroom access before the next meeting"
        description="This case coordinates the operational response without exposing a student’s diagnosis or full requirement profile."
        actions={<StatusBadge status={activeCase.status} />}
      />

      <div className="case-layout">
        <div className="case-primary">
          <section className="case-overview">
            <div className="case-overview-icon"><ClipboardCheck /></div>
            <div>
              <p className="eyebrow">REQUESTED ACTION</p>
              <h2>Reassign CS-GY 6033 from Room 815 to Room 812</h2>
              <p>Room 815 fails 4 required classroom features. Room 812 is available, appropriately sized, and passes all 5 required feature checks.</p>
            </div>
          </section>

          <section className="case-section">
            <div className="section-heading-row"><div><p className="eyebrow">CASE TIMELINE</p><h2>Detection to resolution</h2></div><span className="muted-text">Auto-updating demo</span></div>
            <ol className="timeline">
              <li className="complete">
                <span><CheckCircle2 /></span>
                <div><strong>Room change detected</strong><p>Room 202 → Room 815 for CS-GY 6033</p><small>Jul 29 · 11:14 AM · Registrar feed</small></div>
              </li>
              <li className="complete">
                <span><CheckCircle2 /></span>
                <div><strong>Operational check completed</strong><p>4 required features were not preserved</p><small>Jul 29 · 11:14 AM · RoomReady engine v1.0.0</small></div>
              </li>
              <li className={activeCase.status !== "open" ? "complete" : "current"}>
                <span>{activeCase.status !== "open" ? <CheckCircle2 /> : <CircleDot />}</span>
                <div><strong>Coordinator review</strong><p>{activeCase.assignedTeam}</p><small>{activeCase.status === "open" ? "Awaiting assignment" : "Review in progress"}</small></div>
              </li>
              <li className={activeCase.status === "resolved" ? "complete" : "pending"}>
                <span>{activeCase.status === "resolved" ? <CheckCircle2 /> : <Clock3 />}</span>
                <div><strong>Final room confirmation</strong><p>{activeCase.resolution ?? "Authorised registrar approval required"}</p><small>{activeCase.status === "resolved" ? "Completed in demo" : "Target: Aug 3 · 5:00 PM"}</small></div>
              </li>
            </ol>
          </section>
        </div>

        <aside className="case-sidebar">
          <section className="case-meta">
            <p className="eyebrow">CASE DETAILS</p>
            <dl>
              <div><dt>Responsible team</dt><dd>{activeCase.assignedTeam}</dd></div>
              <div><dt>Priority</dt><dd>Before next class</dd></div>
              <div><dt>Proposed room</dt><dd>Room 812</dd></div>
              <div><dt>Deadline</dt><dd>Aug 3 · 5:00 PM</dd></div>
            </dl>
          </section>
          <section className="case-actions">
            <p className="eyebrow">CASE ACTIONS</p>
            <button type="button" onClick={assign}><UserCheck size={17} /><span><strong>Assign to me</strong><small>Begin coordinator review</small></span><ArrowRight size={16} /></button>
            <button type="button" onClick={() => navigate("/app/alternatives")}><Building2 size={17} /><span><strong>Review Room 812</strong><small>Open room comparison</small></span><ArrowRight size={16} /></button>
            <button type="button" onClick={verify}><Clock3 size={17} /><span><strong>Request verification</strong><small>Send facilities task</small></span><ArrowRight size={16} /></button>
            <button type="button" className="resolve-action" onClick={resolve}><CheckCircle2 size={17} /><span><strong>Confirm & resolve</strong><small>Authorised demo action</small></span><ArrowRight size={16} /></button>
          </section>
        </aside>
      </div>
    </div>
  );
}
