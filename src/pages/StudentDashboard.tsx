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
import { course, maya, roomById } from "../data/demoData";
import { featureLabels } from "../domain/types";
import { useDemo } from "../state/DemoContext";
import { PageHeader, StatusBadge } from "../components/ui";

export function StudentDashboard() {
  const { hasRun, result } = useDemo();
  const currentRoom = roomById(hasRun ? "room-815" : "room-202");

  return (
    <div className="page">
      <PageHeader
        eyebrow="STUDENT VIEW · WEDNESDAY, JULY 29"
        title={`Good morning, ${maya.fullName.split(" ")[0]}.`}
        description="Here’s the readiness status for your upcoming classes."
        actions={
          <span className="privacy-chip"><LockKeyhole size={15} /> Private to you and authorised staff</span>
        }
      />

      {hasRun && result ? (
        <section className="alert-banner" aria-live="polite">
          <span className="alert-banner-icon"><Bell aria-hidden="true" /></span>
          <div>
            <p className="eyebrow">ROOM CHANGE DETECTED · 11:14 AM</p>
            <h2>Your Algorithms classroom needs review</h2>
            <p>Room 815 is missing 4 of your approved classroom features. A compatible alternative has already been identified.</p>
          </div>
          <Link className="button button-dark" to="/app/alert">View update <ArrowRight size={16} /></Link>
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
            <div><p className="eyebrow">TODAY</p><h2>Upcoming classes</h2></div>
            <span className="muted-text">2 classes</span>
          </div>
          <div className="class-card featured">
            <div className="class-time"><strong>3:30</strong><span>PM</span><small>80 min</small></div>
            <div className="class-content">
              <div className="class-topline"><span className="course-chip">{course.courseCode}</span><StatusBadge status={result?.compatibility.status ?? "compatible"} /></div>
              <h3>{course.title}</h3>
              <p><CalendarDays size={15} /> {course.meetingDays}, {course.startTime}–{course.endTime}</p>
              <p><MapPin size={15} /> 2 MetroTech Center · Room {currentRoom.roomNumber}</p>
              <div className="class-feature-summary">
                <span><ShieldCheck size={16} /> {hasRun ? "5 requirements checked · 4 need action" : "5 approved features carried forward"}</span>
                {hasRun && <Link to="/app/alert">Review details <ArrowRight size={15} /></Link>}
              </div>
            </div>
          </div>
          <div className="class-card">
            <div className="class-time"><strong>6:00</strong><span>PM</span><small>75 min</small></div>
            <div className="class-content">
              <div className="class-topline"><span className="course-chip muted">CS-GY 6903</span><StatusBadge status="compatible" /></div>
              <h3>Applied Cryptography</h3>
              <p><CalendarDays size={15} /> Wed, 6:00 PM–7:15 PM</p>
              <p><MapPin size={15} /> 6 MetroTech Center · Room 401</p>
            </div>
          </div>
        </section>

        <aside className="dashboard-aside">
          <div className="summary-card">
            <p className="eyebrow">YOUR CLASSROOM FEATURES</p>
            <h2>5 active requirements</h2>
            <ul className="feature-summary-list">
              {Object.values(featureLabels).slice(0, 5).map((label) => (
                <li key={label}><CheckCircle2 size={16} />{label}</li>
              ))}
            </ul>
            <p className="private-note"><LockKeyhole size={15} /> Your full list is not shared with instructors.</p>
          </div>
          <div className="summary-card">
            <div className="section-heading-row"><p className="eyebrow">OPEN CASES</p><span className="count-chip">{hasRun ? 1 : 0}</span></div>
            {hasRun ? (
              <Link className="case-mini" to="/app/case">
                <span className="case-mini-icon"><Clock3 size={18} /></span>
                <span><strong>RR-1042 · Room review</strong><small>Accessibility Operations · Open</small></span>
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
