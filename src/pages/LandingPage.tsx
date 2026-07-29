import {
  ArrowRight,
  BellRing,
  Check,
  CheckCircle2,
  ClipboardList,
  RefreshCw,
  Route,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";

const room202Features = ["Adjustable desk", "Step-free instruction", "Integrated seating", "Reachable outlet"];
const room815Features = [
  ["Adjustable desk", false],
  ["Step-free instruction", false],
  ["Integrated seating", false],
  ["Reachable outlet", false],
] as const;

export function LandingPage() {
  return (
    <div className="landing">
      <header className="landing-nav">
        <Link className="brand" to="/">
          <span className="brand-mark">R</span>
          <span>RoomReady</span>
        </Link>
        <nav aria-label="Public navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#privacy">Privacy</a>
          <Link className="button button-small button-dark" to="/admin/simulator">
            Launch demo
            <ArrowRight aria-hidden="true" size={16} />
          </Link>
        </nav>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="live-dot" />
              Classroom access continuity
            </p>
            <h1>The room changed.<br />Did access move with it?</h1>
            <p className="hero-lede">
              RoomReady checks every course room change against approved functional
              requirements—before a student arrives to find something missing.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary button-large" to="/admin/simulator">
                Run competition demo
                <ArrowRight aria-hidden="true" size={18} />
              </Link>
              <Link className="text-link" to="/app">
                Explore student view
                <ArrowRight aria-hidden="true" size={16} />
              </Link>
            </div>
            <div className="trust-line">
              <ShieldCheck aria-hidden="true" size={18} />
              <span>Functional requirements only</span>
              <span aria-hidden="true">·</span>
              <span>No diagnoses stored</span>
            </div>
          </div>

          <div className="hero-visual" aria-label="Room 202 ready, then Room 815 needs action">
            <div className="scenario-topline">
              <span className="course-chip">CS-GY 6033</span>
              <span>Design and Analysis of Algorithms</span>
            </div>
            <div className="room-transition">
              <article className="room-snapshot ready">
                <div className="snapshot-heading">
                  <div>
                    <span>ORIGINAL ROOM</span>
                    <strong>Room 202</strong>
                  </div>
                  <span className="mini-status good"><CheckCircle2 size={14} /> Ready</span>
                </div>
                <ul>
                  {room202Features.map((feature) => (
                    <li key={feature}><Check size={15} />{feature}</li>
                  ))}
                </ul>
              </article>
              <div className="transition-arrow" aria-hidden="true">
                <RefreshCw size={18} />
              </div>
              <article className="room-snapshot issue">
                <div className="snapshot-heading">
                  <div>
                    <span>NEW ASSIGNMENT</span>
                    <strong>Room 815</strong>
                  </div>
                  <span className="mini-status bad"><X size={14} /> Needs action</span>
                </div>
                <ul>
                  {room815Features.map(([feature, available]) => (
                    <li key={feature} className={available ? "" : "missing"}>
                      {available ? <Check size={15} /> : <X size={15} />}
                      {feature}
                    </li>
                  ))}
                </ul>
              </article>
            </div>
            <div className="recommendation-strip">
              <span className="recommendation-icon"><Sparkles size={18} /></span>
              <span>
                <small>BEST COMPATIBLE ALTERNATIVE</small>
                <strong>Room 812 · 18 m away · All 5 requirements met</strong>
              </span>
              <ArrowRight aria-hidden="true" size={19} />
            </div>
          </div>
        </section>

        <section className="proof-strip" aria-label="RoomReady product principles">
          <span><strong>5</strong> requirements checked</span>
          <span><strong>0.04s</strong> deterministic evaluation</span>
          <span><strong>Minimum</strong> necessary disclosure</span>
          <span><strong>1</strong> clear next action</span>
        </section>

        <section className="landing-section problem-section">
          <div className="section-intro">
            <p className="eyebrow">THE CONTINUITY GAP</p>
            <h2>A room assignment can change in seconds. Access planning can’t start over.</h2>
          </div>
          <div className="problem-grid">
            <article>
              <span className="number-mark">01</span>
              <h3>A change is detected</h3>
              <p>RoomReady listens for a new room assignment and identifies enrolled students with active functional requirements.</p>
            </article>
            <article>
              <span className="number-mark">02</span>
              <h3>The room is checked</h3>
              <p>A deterministic engine compares every required feature with verified room capability data.</p>
            </article>
            <article>
              <span className="number-mark">03</span>
              <h3>A resolution is prepared</h3>
              <p>Teams receive the minimum information they need, plus a ranked list of only fully compatible alternatives.</p>
            </article>
          </div>
        </section>

        <section className="landing-section distinction" id="how-it-works">
          <div className="distinction-card map">
            <span className="card-icon"><Route /></span>
            <p className="eyebrow">AN ACCESSIBILITY MAP ASKS</p>
            <h2>“What features does this room have?”</h2>
            <p>Useful reference data, but it leaves people to monitor every schedule change and interpret the consequences.</p>
          </div>
          <div className="versus">VS</div>
          <div className="distinction-card ready">
            <span className="card-icon"><BellRing /></span>
            <p className="eyebrow">ROOMREADY ASKS</p>
            <h2>“Did this room change preserve what this class needs?”</h2>
            <p>It connects a specific change to a specific operational check and gives authorised staff a path to resolution.</p>
          </div>
        </section>

        <section className="landing-section privacy-section" id="privacy">
          <div>
            <p className="eyebrow">PRIVACY BY DESIGN</p>
            <h2>Share the task.<br />Not the student’s story.</h2>
            <p>RoomReady keeps diagnoses out of the system and tailors every notification to the recipient’s role.</p>
          </div>
          <div className="privacy-notice">
            <div className="notice-header">
              <span className="avatar instructor">PR</span>
              <span><strong>Instructor notice</strong><small>To: Dr. Priya Raman</small></span>
              <span className="minimum-chip">Minimum necessary</span>
            </div>
            <p>“The assigned room does not currently satisfy an approved classroom-access requirement. The Registrar and Accessibility teams are reviewing a compatible alternative.”</p>
            <div className="notice-footer"><ShieldCheck size={17} /> No diagnosis or complete profile disclosed</div>
          </div>
        </section>

        <section className="landing-cta">
          <span className="cta-icon"><ClipboardList /></span>
          <h2>See the entire response unfold in under two minutes.</h2>
          <p>Change Room 202 to Room 815, identify the gap, compare alternatives, and resolve the case.</p>
          <Link className="button button-primary button-large" to="/admin/simulator">
            Launch RoomReady demo
            <ArrowRight size={18} />
          </Link>
        </section>
      </main>
      <footer className="landing-footer">
        <Link className="brand" to="/">
          <span className="brand-mark">R</span>
          <span>RoomReady</span>
        </Link>
        <p>Competition prototype · Synthetic data only · Operational checks, not legal determinations</p>
      </footer>
    </div>
  );
}
