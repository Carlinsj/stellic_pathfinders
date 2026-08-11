import { ArrowLeft, Database, MapPinOff, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Brand } from '../components/Brand';

export function PrivacyPage() {
  return <div className="policy-page">
    <header className="policy-header"><Brand /><Link to="/"><ArrowLeft size={16} />Back to CampusFit</Link></header>
    <main id="main-content" className="policy-main" tabIndex={-1}>
      <div className="policy-heading"><span className="kicker"><ShieldCheck size={15} />Privacy policy</span><h1>Privacy in the CampusFit prototype</h1><p>Effective August 5, 2026</p></div>

      <aside className="policy-summary" aria-label="Privacy summary">
        <div><Database /><strong>Synthetic demo data</strong><span>No real student or official occupancy feed is connected.</span></div>
        <div><MapPinOff /><strong>No location tracking</strong><span>The demo does not request or continuously track your location.</span></div>
        <div><ShieldCheck /><strong>No public attendance</strong><span>Student-facing screens show aggregate patterns, never named attendance lists.</span></div>
      </aside>

      <article className="policy-content">
        <section><h2>1. Scope</h2><p>CampusFit is a competition prototype, not an NYU-operated production service. It uses deterministic synthetic people, visits, facility conditions, and forecasts to demonstrate a campus recreation planning experience. No university sign-on, official occupancy system, or production student database is connected.</p></section>

        <section><h2>2. Information handled by this demo</h2><p>When you use the prototype, you may select a synthetic demo account and create synthetic plans, check-ins, workout focuses, activity choices, and staff scenarios. These actions update the demo state in your current browser session. The selected synthetic account identifier is kept in browser <code>sessionStorage</code> so navigation works during that tab’s session.</p></section>

        <section><h2>3. How information is used</h2><p>Demo inputs are used only to operate the prototype: showing recommendations, estimating demand ranges, walking through visit lifecycles, and demonstrating role-specific screens. CampusFit check-ins are voluntary participation signals and are never described as total or official facility occupancy.</p></section>

        <section><h2>4. Sharing and visibility</h2><p>The prototype does not publish attendance lists, workout feeds, or another student’s raw active visit. Student-facing demand is presented as aggregate or threshold-suppressed information. The local demo does not send its synthetic session state to a CampusFit backend or sell it to third parties.</p></section>

        <section><h2>5. Location, cookies, and tracking</h2><p>The prototype does not request GPS access or use continuous location tracking. It does not set advertising cookies or include advertising analytics. Its installable-app service worker may cache public application files so the demo loads reliably; that cache does not contain a real student record.</p></section>

        <section><h2>6. Retention and deletion</h2><p>Synthetic demo state resets when the page is refreshed or the demo is reset. The selected demo account remains only for the browser tab’s session and is removed when you sign out or the tab session ends. Any future production service would need its own university-approved retention, deletion, security, and incident-response controls before handling real data.</p></section>

        <section><h2>7. Changes and questions</h2><p>This policy will be updated if the prototype’s data handling changes. Questions about this repository can be sent to the project maintainers through the <a href="https://github.com/Carlinsj/stellic_pathfinders">CampusFit repository</a>. Do not send private student, health, or authentication information through a public repository issue.</p></section>
      </article>
    </main>
    <footer className="policy-footer"><Brand inverted /><p>CampusFit competition prototype · Synthetic data only</p></footer>
  </div>;
}
