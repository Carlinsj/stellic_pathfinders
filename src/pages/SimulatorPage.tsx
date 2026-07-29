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
import { course } from "../data/demoData";
import { PageHeader, StatusBadge } from "../components/ui";
import { useDemo } from "../state/DemoContext";
import { roomChangeInputSchema } from "../domain/validation";

export function SimulatorPage() {
  const { hasRun, result, runDemo, resetDemo, effectiveAt } = useDemo();
  const [selectedRoom, setSelectedRoom] = useState(hasRun ? "room-815" : "room-202");
  const [effective, setEffective] = useState(effectiveAt.slice(0, 16));
  const [formError, setFormError] = useState("");

  const trigger = () => {
    const parsed = roomChangeInputSchema.safeParse({
      sectionId: course.id,
      previousRoomId: "room-202",
      newRoomId: "room-815",
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
    setSelectedRoom("room-202");
  };

  return (
    <div className="page simulator-page">
      <PageHeader
        eyebrow="ADMINISTRATIVE ROOM-CHANGE SIMULATOR"
        title="See access continuity checks happen live"
        description="This seeded scenario is synthetic, deterministic, and ready to demonstrate in under two minutes."
        actions={
          <button className="button button-secondary" type="button" onClick={reset}>
            <RefreshCcw size={16} /> Reset demo
          </button>
        }
      />

      <div className="simulator-grid">
        <section className="simulator-control">
          <div className="competition-label"><Bolt size={16} /> COMPETITION SCENARIO</div>
          <h2>Move Algorithms from Room 202 to Room 815</h2>
          <p>The new room has an accessible entrance and elevator—but four classroom features do not carry forward.</p>
          <div className="simulator-form">
            <label>
              <span>Course section</span>
              <select defaultValue={course.id}>
                <option value={course.id}>{course.courseCode} · {course.title}</option>
              </select>
            </label>
            <div className="room-change-fields">
              <label>
                <span>Current room</span>
                <select value="room-202" disabled><option value="room-202">Room 202 · 2 MetroTech</option></select>
              </label>
              <ChevronRight aria-hidden="true" />
              <label>
                <span>New room</span>
                <select value={selectedRoom} onChange={(event) => setSelectedRoom(event.target.value)}>
                  <option value="room-202">Room 202 · Ready</option>
                  <option value="room-815">Room 815 · Demo scenario</option>
                  <option value="room-812">Room 812 · Ready</option>
                  <option value="room-804">Room 804 · Verify</option>
                </select>
              </label>
            </div>
            <label>
              <span>Effective date and time</span>
              <div className="input-icon"><CalendarClock size={17} /><input type="datetime-local" value={effective} onChange={(event) => setEffective(event.target.value)} /></div>
            </label>
            {formError && <p className="form-error" role="alert">{formError}</p>}
          </div>
          <button className="run-demo-button" type="button" onClick={trigger}>
            <span><Play fill="currentColor" size={19} /></span>
            <span><strong>Run competition demo</strong><small>Trigger room change and evaluate affected students</small></span>
            <ArrowRight size={20} />
          </button>
          <p className="demo-disclaimer">No external integrations or AI decision-making are required for this scenario.</p>
        </section>

        <section className={`live-result${hasRun ? " active" : ""}`} aria-live="polite">
          {!hasRun || !result ? (
            <div className="waiting-state">
              <span className="waiting-icon"><Bolt /></span>
              <p className="eyebrow">LIVE WORKFLOW</p>
              <h2>Ready for the room change</h2>
              <p>Run the scenario to see affected enrolments, room checks, alternatives, and notifications update here.</p>
              <ol>
                <li><span>1</span>Detect change</li>
                <li><span>2</span>Check requirements</li>
                <li><span>3</span>Create response</li>
              </ol>
            </div>
          ) : (
            <div className="result-active">
              <div className="live-result-top">
                <div><p className="eyebrow">WORKFLOW COMPLETE · 0.04s</p><h2>Room 815 needs action</h2></div>
                <StatusBadge status={result.compatibility.status} />
              </div>
              <div className="workflow-steps">
                <div><span><CheckCircle2 /></span><p><strong>Change detected</strong><small>Room 202 → 815</small></p></div>
                <div><span><CheckCircle2 /></span><p><strong>1 student affected</strong><small>5 requirements evaluated</small></p></div>
                <div><span><CheckCircle2 /></span><p><strong>Case RR-1042 created</strong><small>4 missing features</small></p></div>
                <div><span><CheckCircle2 /></span><p><strong>Room 812 recommended</strong><small>5 of 5 requirements met</small></p></div>
              </div>
              <div className="impact-panel">
                <div><span className="avatar maya">MC</span><span><strong>Maya Chen</strong><small>CS-GY 6033 · Enrolled student</small></span></div>
                <div className="impact-stats"><span><Users size={16} /><strong>1</strong> affected</span><span><UserRoundCheck size={16} /><strong>5</strong> checked</span></div>
              </div>
              <div className="best-alternative">
                <p className="eyebrow">BEST COMPATIBLE ALTERNATIVE</p>
                <div><span className="room-number-large">812</span><span><strong>Room 812</strong><small>Available · 52 seats · Same floor · Verified</small></span><StatusBadge status="compatible" compact /></div>
              </div>
              <div className="result-links">
                <Link className="button button-primary" to="/app/alert">Open room-change alert <ArrowRight size={16} /></Link>
                <Link className="text-link" to="/notifications">Preview messages <ArrowRight size={16} /></Link>
              </div>
            </div>
          )}
        </section>
      </div>

      <section className="simulator-assurance">
        <span><CheckCircle2 /> Same input, same result</span>
        <span><CheckCircle2 /> Template fallback enabled</span>
        <span><CheckCircle2 /> Synthetic student data</span>
        <span><CheckCircle2 /> Staff confirmation required</span>
      </section>
    </div>
  );
}
