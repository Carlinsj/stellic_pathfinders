import {
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Save,
  ShieldAlert,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { PageHeader, StatusBadge } from "../components/ui";
import type { Availability } from "../domain/types";
import { useDemo } from "../state/DemoContext";

const availabilityLabels: Record<Availability, string> = {
  available: "Available",
  unavailable: "Unavailable",
  unknown: "Needs verification",
  temporarily_unavailable: "Temporarily unavailable",
};

export function RoomPage() {
  const { roomId } = useParams();
  const { tenant, roomOverrides, updateRoomFeatures } = useDemo();
  const fallbackRoom = tenant.scenario.rooms.find((room) => room.id === tenant.scenario.replacementRoomId)!;
  const baseRoom = tenant.scenario.rooms.find((room) => room.id === roomId) ?? fallbackRoom;
  const building = tenant.scenario.buildings.find((item) => item.id === baseRoom.buildingId);
  const [features, setFeatures] = useState(roomOverrides[baseRoom.id] ?? baseRoom.features);
  const [saved, setSaved] = useState(false);
  const labelMap = useMemo(
    () => Object.fromEntries(tenant.featureCatalogue.map((feature) => [feature.key, feature.displayName])),
    [tenant.featureCatalogue],
  );

  useEffect(() => {
    setFeatures(roomOverrides[baseRoom.id] ?? baseRoom.features);
  }, [baseRoom, roomOverrides]);

  const changeAvailability = (index: number, availability: Availability) => {
    setSaved(false);
    setFeatures((current) =>
      current.map((feature, featureIndex) =>
        featureIndex === index
          ? { ...feature, availability, verifiedAt: new Date().toISOString() }
          : feature,
      ),
    );
  };

  const save = () => {
    updateRoomFeatures(baseRoom.id, features);
    setSaved(true);
  };

  return (
    <div className="page">
      <PageHeader
        eyebrow={`${tenant.shortName.toUpperCase()} · SYNTHETIC ROOM INVENTORY`}
        title={baseRoom.roomNumber}
        description={`${building?.name} · ${baseRoom.roomType}. This administrator view is isolated to ${tenant.shortName}.`}
        actions={<button className="button button-primary" type="button" onClick={save}><Save size={16} /> Save room record</button>}
      />
      {saved && <div className="save-confirmation" role="status"><CheckCircle2 size={17} /> Room capabilities saved to this demo tenant.</div>}
      <div className="room-page-grid">
        <section className="room-feature-editor">
          <div className="section-heading-row"><div><p className="eyebrow">FEATURE CATALOGUE MAPPING</p><h2>Verified room capabilities</h2></div><StatusBadge status={baseRoom.verificationStatus === "verified" ? "compatible" : "verification_required"} /></div>
          <p className="synthetic-inline"><ShieldAlert size={16} /> Synthetic demonstration record; verify against an authoritative facilities source before production use.</p>
          <div className="feature-editor-list">
            {features.map((feature, index) => (
              <div className="feature-editor-row" key={`${feature.featureType}-${index}`}>
                <div><strong>{labelMap[feature.featureType]}</strong><small>Stable concept: {feature.featureType} · {feature.verificationSource}</small></div>
                <label><span className="sr-only">{labelMap[feature.featureType]}</span><select value={feature.availability} onChange={(event) => changeAvailability(index, event.target.value as Availability)}>
                  {Object.entries(availabilityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select></label>
              </div>
            ))}
          </div>
        </section>
        <aside className="room-aside">
          <section className="summary-card">
            <p className="eyebrow">ROOM DETAILS</p>
            <dl className="room-details-list">
              <div><dt>University</dt><dd>{tenant.shortName}</dd></div>
              <div><dt>Building</dt><dd>{building?.name}</dd></div>
              <div><dt>Floor</dt><dd>{baseRoom.floor}</dd></div>
              <div><dt>Capacity</dt><dd>{baseRoom.capacity}</dd></div>
              <div><dt>Room type</dt><dd>{baseRoom.roomType}</dd></div>
              <div><dt>Tenant ID</dt><dd>{tenant.id.slice(0, 8)}…</dd></div>
            </dl>
          </section>
          <section className="summary-card outage-card">
            <div className="section-heading-row"><p className="eyebrow">VERIFICATION REQUESTS</p><span className="count-chip">{baseRoom.id === tenant.scenario.verificationRequestRoomId ? 1 : 0}</span></div>
            {baseRoom.id === tenant.scenario.verificationRequestRoomId ? <div className="assigned-class"><Clock3 size={18} /><span><strong>Feature verification requested</strong><small>{tenant.terminology.facilitiesOffice} · Open</small></span></div> : <div className="empty-state-small"><CheckCircle2 size={22} /><strong>No open requests</strong></div>}
          </section>
          <section className="summary-card">
            <p className="eyebrow">ASSIGNED CLASS</p>
            <div className="assigned-class"><CalendarDays size={18} /><span><strong>{tenant.scenario.course.courseCode}</strong><small>{tenant.scenario.course.meetingDays}, {tenant.scenario.course.startTime}</small></span></div>
          </section>
        </aside>
      </div>
      <p className="operational-note"><Building2 size={16} /> Changes affect future operational checks only inside this tenant.</p>
    </div>
  );
}
