import { ArrowRight, CheckCircle2, MapPin, ShieldCheck, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { Meter, PageHeader, StatusBadge } from "../components/ui";
import { rankAlternativeRooms } from "../domain/rankRooms";
import { useDemo } from "../state/DemoContext";
import { roomForTenant } from "../tenancy/tenantConfigs";

export function AlternativesPage() {
  const { result, tenant } = useDemo();
  const scenario = tenant.scenario;
  const featureLabelMap = Object.fromEntries(
    tenant.featureCatalogue.map((feature) => [feature.key, feature.displayName]),
  );
  const alternatives =
    result?.alternatives ??
    rankAlternativeRooms({
      rooms: scenario.rooms.filter((room) => room.id !== scenario.originalRoomId),
      requirements: scenario.requirements,
      course: scenario.course,
      currentRoom: roomForTenant(tenant, scenario.originalRoomId),
      featureLabelMap,
      evaluatedAt: scenario.detectedAt,
    });
  const top = alternatives[0];

  return (
    <div className="page">
      <PageHeader
        eyebrow={`${tenant.shortName.toUpperCase()} COMPATIBLE ROOM RANKING`}
        title="Only fully compatible rooms are recommended"
        description={`The shared engine applies hard compatibility gates first, then ranks ${tenant.shortName} rooms by schedule, capacity, travel, freshness, and disruption.`}
      />

      {top && (
        <section className="best-room-card">
          <div>
            <p className="eyebrow">BEST COMPATIBLE ALTERNATIVE</p>
            <h2>{top.room.roomNumber}</h2>
            <p>{scenario.buildings.find((building) => building.id === top.room.buildingId)?.name} · {top.room.roomType}</p>
          </div>
          <div className="best-room-score">
            <strong>{top.score}</strong><span>/100</span>
            <StatusBadge status={top.compatibility.status} compact />
          </div>
          <div className="best-room-facts">
            <span><ShieldCheck size={17} /> {top.compatibility.passed.length} of {scenario.requirements.length} required features</span>
            <span><Users size={17} /> {top.room.capacity} seats</span>
            <span><MapPin size={17} /> {top.room.distanceMeters} m from original</span>
          </div>
          <Link className="button button-primary" to={`/${tenant.slug}/admin/case`}>Review resolution <ArrowRight size={16} /></Link>
        </section>
      )}

      <section className="ranking-list">
        <div className="section-heading-row"><div><p className="eyebrow">TENANT-SCOPED INVENTORY</p><h2>Comparison</h2></div><span className="muted-text">{alternatives.length} rooms evaluated</span></div>
        {alternatives.slice(0, 6).map((candidate, index) => (
          <article key={candidate.room.id} className={`ranking-row${candidate.eligible ? "" : " ineligible"}`}>
            <span className="rank-number">{index + 1}</span>
            <div className="ranking-room">
              <h3>{candidate.room.roomNumber}</h3>
              <p>{scenario.buildings.find((building) => building.id === candidate.room.buildingId)?.name}</p>
            </div>
            <div className="ranking-status">
              <StatusBadge status={candidate.compatibility.status} compact />
              <span>{candidate.room.scheduleAvailable ? "Schedule open" : "Schedule conflict"}</span>
            </div>
            <div className="ranking-meter">
              <Meter score={candidate.score} />
              <span>{candidate.score} points</span>
            </div>
            <div className="ranking-rationale">
              {candidate.rationale.slice(0, 2).map((reason) => <span key={reason}><CheckCircle2 size={14} />{reason}</span>)}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
