import { ArrowRight, CalendarClock, Info, MapPin, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { RequirementList, PageHeader, RoomPill, StatusBadge } from "../components/ui";
import { roomById } from "../data/demoData";
import { evaluateCompatibility } from "../domain/compatibilityEngine";
import { mayaRequirements } from "../data/demoData";
import { useDemo } from "../state/DemoContext";

export function RoomChangeAlert() {
  const { hasRun, result, runDemo } = useDemo();
  const fallback = evaluateCompatibility({
    requirements: mayaRequirements,
    roomFeatures: roomById("room-815").features,
    evaluatedAt: "2026-07-29T15:14:00.000Z",
  });
  const compatibility = result?.compatibility ?? fallback;

  return (
    <div className="page">
      <PageHeader
        eyebrow="ROOM-CHANGE ALERT · RR-1042"
        title="This room change needs action"
        description="An operational check found that the new assignment does not preserve every approved classroom feature."
        actions={<StatusBadge status={hasRun ? compatibility.status : "incompatible"} />}
      />
      {!hasRun && (
        <div className="demo-nudge">
          <span><Info size={18} /> Previewing the competition scenario.</span>
          <button className="button button-dark button-small" onClick={() => runDemo()} type="button">Activate scenario</button>
        </div>
      )}

      <section className="comparison-hero">
        <div className="comparison-room old">
          <p className="eyebrow">ORIGINAL ASSIGNMENT</p>
          <div className="room-title"><RoomPill number="202" muted /><span><strong>2 MetroTech Center</strong><small>Flexible lecture room · Floor 2</small></span></div>
          <StatusBadge status="compatible" compact />
          <p>All 5 required features supported</p>
        </div>
        <div className="comparison-change">
          <span><ArrowRight size={20} /></span>
          <small>Room changed</small>
        </div>
        <div className="comparison-room new">
          <p className="eyebrow">NEW ASSIGNMENT</p>
          <div className="room-title"><RoomPill number="815" /><span><strong>2 MetroTech Center</strong><small>Tiered lecture room · Floor 8</small></span></div>
          <StatusBadge status="incompatible" compact />
          <p>4 required features need action</p>
        </div>
        <div className="effective-card">
          <CalendarClock size={20} />
          <span><small>EFFECTIVE</small><strong>Tue, Aug 4 · 3:30 PM</strong></span>
        </div>
      </section>

      <div className="result-summary">
        <div><strong>{compatibility.passed.length}</strong><span>Passed</span></div>
        <div><strong>{compatibility.failed.length}</strong><span>Missing</span></div>
        <div><strong>{compatibility.unknown.length}</strong><span>Unknown</span></div>
        <p>{compatibility.explanation}</p>
      </div>

      <div className="check-grid">
        <section className="check-card passed">
          <div className="check-card-heading"><h2>Preserved features</h2><span>{compatibility.passed.length}</span></div>
          <RequirementList items={compatibility.passed} state="passed" />
        </section>
        <section className="check-card failed">
          <div className="check-card-heading"><h2>Features not preserved</h2><span>{compatibility.failed.length}</span></div>
          <RequirementList items={compatibility.failed} state="failed" />
        </section>
      </div>

      <section className="next-step-card">
        <span className="next-step-number">01</span>
        <div>
          <p className="eyebrow">RECOMMENDED NEXT STEP</p>
          <h2>Move the class to Room 812</h2>
          <p>Room 812 is available, fits all 42 enrolled students, and satisfies every active required feature. Authorised staff confirmation is required.</p>
          <div className="location-line"><MapPin size={16} /> Same building · Floor 8 · 18 m from Room 815</div>
        </div>
        <Link className="button button-primary" to="/app/alternatives">Compare rooms <ArrowRight size={16} /></Link>
      </section>

      <p className="operational-note"><ShieldCheck size={16} /> This result is an operational room-readiness check, not a legal determination. Student diagnoses are not stored or displayed.</p>
    </div>
  );
}
