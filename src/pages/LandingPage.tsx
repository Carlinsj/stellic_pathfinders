import { ArrowRight, BarChart3, CheckCircle2, Clock3, Code2, Dumbbell, GraduationCap, ShieldCheck, Sparkles, UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Brand } from '../components/Brand';

export function LandingPage() {
  return <div className="landing-page">
    <header className="landing-header"><Brand /><nav aria-label="Landing navigation"><a href="#project-story">Project story</a><a href="#how-it-works">How it works</a><a href="#privacy">Privacy approach</a><Link to="/nyu/staff-login">Staff access</Link><Link className="button button--secondary button--small" to="/nyu/login">Open student demo</Link></nav></header>
    <main id="main-content" tabIndex={-1}>
      <section className="landing-hero">
        <div className="hero-copy"><span className="kicker"><Sparkles size={14} />Built for the rhythm of NYU</span><h1>Know where and when to <em>work out.</em></h1><p>CampusFit turns NYU facility resources, live participation, student plans, and historical patterns into workout-specific guidance—before you leave for the gym.</p><div className="hero-actions"><Link className="button button--primary button--large" to="/nyu/login">Explore NYU CampusFit <ArrowRight size={18} /></Link></div><small className="synthetic-note"><span /> NYU competition prototype · All demonstration data is synthetic</small></div>
        <div className="hero-visual" aria-label="CampusFit demand preview">
          <div className="visual-orbit visual-orbit--one" /><div className="visual-orbit visual-orbit--two" />
          <div className="phone-frame"><div className="phone-speaker" /><div className="mini-brand"><Brand linked={false} /><span>Today</span></div><p className="mini-kicker">YOUR BEST MOVE</p><h2>Paulson at 7:30</h2><p className="mini-copy">Lighter cable demand could save you 18–24 minutes.</p><div className="mini-demand"><div><span className="pulse-dot" /><strong>Moderate</strong><small>overall demand</small></div><div><strong>12</strong><small>CampusFit users</small></div></div><div className="mini-equipment"><span>Cable stations</span><b>Low wait</b><i style={{ width: '36%' }} /></div><div className="mini-equipment"><span>Row machines</span><b>Moderate</b><i style={{ width: '61%' }} /></div><div className="mini-action">Plan this workout <ArrowRight size={15} /></div></div>
          <div className="floating-card floating-card--top"><Clock3 size={18} /><div><strong>Save 24 min</strong><small>by shifting your visit</small></div></div>
          <div className="floating-card floating-card--bottom"><Dumbbell size={18} /><div><strong>Back day alert</strong><small>Cables high at 6:00</small></div></div>
        </div>
      </section>
      <section className="trust-ribbon"><span>Focused on NYU recreation</span><div><b>NYU Athletics</b><b><GraduationCap size={22} /> Four verified facilities</b></div></section>
      <section id="project-story" className="project-story-section" aria-labelledby="project-story-title">
        <div className="project-story-heading">
          <div><span className="kicker"><Sparkles size={14} />Pathfinders Challenge · Overcoming Obstacles</span><h2 id="project-story-title">A clearer answer before the walk to the gym.</h2></div>
          <p>CampusFit removes the scheduling and resource uncertainty that makes campus recreation harder to use. It turns scattered facility information and explainable demand signals into one practical student decision.</p>
        </div>
        <div className="project-story-grid">
          <article className="project-story-card project-story-card--problem"><span className="project-story-number">01</span><small>The student problem</small><h3>The wrong trip costs more than time.</h3><p>Between classes, work, and commuting, students cannot afford to cross campus only to find the wrong facility, unavailable equipment, or demand that does not fit their workout.</p></article>
          <article className="project-story-card project-story-card--solution"><span className="project-story-number">02</span><small>What I built</small><h3>One plan, matched to the workout.</h3><p>Students choose a focus and time window, compare eligible NYU facilities, and receive a recommendation using hours, travel, relevant equipment, outages, expected duration, and demand ranges.</p><Link className="project-story-link" to="/nyu/login">Try the student flow <ArrowRight size={16} /></Link></article>
          <article className="project-story-card project-story-card--audience"><span className="project-story-number">03</span><small>Who it is for</small><h3>Students fitting movement into a full day.</h3><p>CampusFit is designed for commuters, students with jobs, and anyone trying to make a realistic recreation plan between campus commitments—not optimize every minute of their life.</p></article>
          <article className="project-story-card project-story-card--trust"><span className="project-story-number">04</span><small>Built to be honest</small><h3>Guidance without false precision.</h3><ul><li><CheckCircle2 />Ranges, confidence, freshness, and sources stay visible</li><li><CheckCircle2 />Voluntary check-ins are never labeled official occupancy</li><li><CheckCircle2 />Student activity stays aggregate and privacy-protected</li></ul></article>
        </div>
        <div className="project-proof" aria-label="CampusFit project proof points">
          <div><strong>4</strong><span>verified NYU recreation facilities</span></div>
          <div><strong>0</strong><span>public attendance lists or location tracking</span></div>
          <div><strong>1</strong><span>explainable recommendation for the student</span></div>
          <div className="project-stack"><span><Code2 size={16} />Built and tested with</span><p>React · TypeScript · Vite · Supabase model · Vitest · Playwright</p></div>
        </div>
      </section>
      <section id="how-it-works" className="feature-section"><div className="section-heading"><span className="kicker">Not just “busy”</span><h2>The right gym depends on <em>your workout.</em></h2><p>A moderate crowd can still mean a frustrating back day. CampusFit translates facility demand into the equipment and activities you actually need.</p></div><div className="feature-grid">
        <article><span className="feature-number">01</span><BarChart3 /><h3>See demand clearly</h3><p>Live CampusFit participation stays distinct from predicted and historical demand.</p></article>
        <article className="feature-card--dark"><span className="feature-number">02</span><Dumbbell /><h3>Plan around your visit</h3><p>Compare cable and rack demand for workouts—or court, pool, wall, studio, and activity demand on its own.</p></article>
        <article><span className="feature-number">03</span><Clock3 /><h3>Get time back</h3><p>See likely queue time and a realistic workout duration before walking over.</p></article>
      </div></section>
      <section id="privacy" className="privacy-section"><div><span className="kicker"><ShieldCheck size={14} />Privacy by default</span><h2>Useful together.<br /><em>Anonymous by design.</em></h2><p>CampusFit shares server-calculated patterns, never public attendance lists. Small groups are suppressed, personal history stays personal, and continuous location tracking is never required.</p><ul><li><ShieldCheck /> Minimum-count privacy thresholds</li><li><UsersRound /> Anonymous aggregates by default</li><li><GraduationCap /> University-isolated tenant data</li></ul></div><div className="privacy-card"><span className="privacy-shield"><ShieldCheck size={35} /></span><small>LIVE AT PALLADIUM</small><strong>38</strong><p>CampusFit users checked in</p><hr /><div><span>Back workout</span><b>11</b></div><div><span>Squash</span><b>Low activity</b></div><footer>This is voluntary CampusFit participation—not official total occupancy.</footer></div></section>
      <section className="cta-section"><div><span className="kicker">NYU competition demo</span><h2>Make your next workout<br /><em>a better decision.</em></h2></div><div><Link className="button button--primary button--large" to="/nyu/login">Start NYU scenario <ArrowRight size={18} /></Link><Link className="text-link" to="/nyu/staff-login">Open the NYU staff portal</Link></div></section>
    </main>
    <footer className="landing-footer"><Brand inverted /><div><p>CampusFit is a demonstration platform using synthetic data. No university authentication or official occupancy integration is connected.</p><Link to="/privacy">Privacy policy</Link></div></footer>
  </div>;
}
