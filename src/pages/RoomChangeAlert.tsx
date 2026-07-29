import { ArrowRight, CalendarClock, Info, MapPin, ShieldCheck } from "lucide-react";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { PageHeader, RequirementList, RoomPill, StatusBadge } from "../components/ui";
import { evaluateCompatibility } from "../domain/compatibilityEngine";
import { useDemo } from "../state/DemoContext";
import { roomForTenant } from "../tenancy/tenantConfigs";

export function RoomChangeAlert() {
  const { hasRun, result, runDemo, tenant } = useDemo();
  useEffect(() => {
    if (!hasRun) runDemo();
  }, [hasRun, runDemo]);

  const scenario = tenant.scenario;
  const original = roomForTenant(tenant, scenario.originalRoomId);
  const replacement = roomForTenant(tenant, scenario.replacementRoomId);
  const originalBuilding = scenario.buildings.find((item) => item.id === original.buildingId);
  const replacementBuilding = scenario.buildings.find((item) => item.id === replacement.buildingId);
  const labelMap = Object.fromEntries(
    tenant.featureCatalogue.map((feature) => [feature.key, feature.displayName]),
  );
  const originalResult = evaluateCompatibility({
    requirements: scenario.requirements,
    roomFeatures: original.features,
    featureLabelMap: labelMap,
    evaluatedAt: scenario.detectedAt,
  });
  const compatibility = result?.compatibility ?? originalResult;

  return (
    <div className="page alert-page">
      <PageHeader
        eyebrow={`${tenant.shortName.toUpperCase()} ROOM-CHANGE ALERT`}
        title="This room change needs action"
        description={`${scenario.course.courseCode} was reassigned. RoomReady checked the same stable feature concepts using ${tenant.shortName}'s catalogue labels.`}
        actions={<StatusBadge status={compatibility.status} />}
      />

      <section className="change-summary">
        <article>
          <p className="eyebrow">ORIGINAL · READY</p>
          <div className="room-title"><RoomPill number={original.roomNumber} muted /><span><strong>{originalBuilding?.name}</strong><small>{original.roomType} · Floor {original.floor}</small></span></div>
          <StatusBadge status={originalResult.status} compact />
        </article>
        <div className="change-arrow" aria-hidden="true"><ArrowRight /></div>
        <article className="issue-room">
          <p className="eyebrow">NEW ASSIGNMENT · NEEDS ACTION</p>
          <div className="room-title"><RoomPill number={replacement.roomNumber} /><span><strong>{replacementBuilding?.name}</strong><small>{replacement.roomType} · Floor {replacement.floor}</small></span></div>
          <StatusBadge status={compatibility.status} compact />
        </article>
      </section>

      <div className="alert-content-grid">
        <section className="check-card">
          <div className="section-heading-row">
            <div><p className="eyebrow">DETERMINISTIC CHECK</p><h2>{compatibility.failed.length} required features need action</h2></div>
            <span className="engine-chip">Engine {compatibility.engineVersion}</span>
          </div>
          <RequirementList items={compatibility.failed} state="failed" />
          <RequirementList items={compatibility.unknown} state="unknown" />
          <details>
            <summary>{compatibility.passed.length} requirement{compatibility.passed.length === 1 ? "" : "s"} passed</summary>
            <RequirementList items={compatibility.passed} state="passed" />
          </details>
        </section>

        <aside className="next-action-card">
          <span className="next-action-icon"><ShieldCheck /></span>
          <p className="eyebrow">RECOMMENDED NEXT ACTION</p>
          <h2>Move the class to {roomForTenant(tenant, scenario.recommendedRoomId).roomNumber}</h2>
          <p>The highest-ranked available room satisfies every active required feature and fits the course.</p>
          <Link className="button button-primary" to={`/${tenant.slug}/student/alternatives`}>Compare rooms <ArrowRight size={16} /></Link>
          <div className="deadline-line"><CalendarClock size={16} /><span>Resolve before {new Date(scenario.effectiveAt).toLocaleString("en-US", { timeZone: tenant.timezone, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span></div>
        </aside>
      </div>

      <section className="privacy-context">
        <Info size={19} />
        <div><strong>Private operational context</strong><p>{tenant.terminology.accessibilityOffice} can see requirement-level details. Instructors receive only a privacy-safe notice.</p></div>
        <span><MapPin size={15} /> {replacementBuilding?.name}</span>
      </section>
    </div>
  );
}
