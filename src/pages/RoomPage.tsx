import {
  AlertTriangle,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Save,
  ShieldCheck,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { PageHeader, StatusBadge } from "../components/ui";
import { buildings, roomById } from "../data/demoData";
import { featureLabels, type Availability } from "../domain/types";
import { useDemo } from "../state/DemoContext";

const availabilityLabels: Record<Availability, string> = {
  available: "Available",
  unavailable: "Unavailable",
  unknown: "Unknown",
  temporarily_unavailable: "Temporarily unavailable",
};

export function RoomPage() {
  const { roomId = "room-815" } = useParams();
  const baseRoom = roomById(roomId);
  const { roomOverrides, updateRoomFeatures } = useDemo();
  const roomFeatures = roomOverrides[roomId] ?? baseRoom.features;
  const [draft, setDraft] = useState(roomFeatures);
  const [saved, setSaved] = useState(false);
  const building = buildings.find((item) => item.id === baseRoom.buildingId);
  const unavailable = useMemo(
    () => draft.filter((feature) => feature.availability !== "available").length,
    [draft],
  );

  const changeAvailability = (index: number, availability: Availability) => {
    setDraft((current) =>
      current.map((feature, featureIndex) =>
        featureIndex === index
          ? { ...feature, availability, verifiedAt: new Date().toISOString() }
          : feature,
      ),
    );
    setSaved(false);
  };

  const save = () => {
    updateRoomFeatures(roomId, draft);
    setSaved(true);
  };

  return (
    <div className="page">
      <PageHeader
        eyebrow="ROOM CAPABILITY RECORD"
        title={`${building?.name ?? "Campus"} · Room ${baseRoom.roomNumber}`}
        description={`${baseRoom.roomType} · Floor ${baseRoom.floor} · ${baseRoom.capacity} seats`}
        actions={
          <button className="button button-primary" type="button" onClick={save}>
            <Save size={16} /> Save verified changes
          </button>
        }
      />
      {saved && (
        <div className="save-confirmation" role="status">
          <CheckCircle2 size={18} /> Room capability record updated and audit event created.
        </div>
      )}

      <div className="room-page-grid">
        <section className="capability-panel">
          <div className="capability-summary">
            <div>
              <span className="room-number-display">{baseRoom.roomNumber}</span>
              <span><strong>{building?.name}</strong><small>{building?.address}</small></span>
            </div>
            <StatusBadge status={unavailable ? "incompatible" : "compatible"} />
          </div>
          <div className="verification-line">
            <ShieldCheck size={17} />
            <span><strong>Facilities walkthrough</strong><small>Last verified July 18, 2026 · Alex Morgan</small></span>
            <span className="verification-chip">Verified</span>
          </div>

          <div className="capability-heading">
            <div><p className="eyebrow">ACCESSIBILITY-RELATED FEATURES</p><h2>Room inventory</h2></div>
            <span>{draft.length} records</span>
          </div>
          <div className="feature-editor-list">
            {draft.map((feature, index) => (
              <div className="feature-editor" key={feature.featureType}>
                <span className={`feature-state state-${feature.availability}`}>
                  {feature.availability === "available" ? <CheckCircle2 /> : <AlertTriangle />}
                </span>
                <div>
                  <strong>{featureLabels[feature.featureType]}</strong>
                  <p>{feature.notes ?? "Verified during the latest facilities walkthrough."}</p>
                  <small>Source: {feature.verificationSource} · Jul 18, 2026</small>
                </div>
                <label>
                  <span className="sr-only">Availability for {featureLabels[feature.featureType]}</span>
                  <select
                    value={feature.availability}
                    onChange={(event) =>
                      changeAvailability(index, event.target.value as Availability)
                    }
                  >
                    {Object.entries(availabilityLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </label>
              </div>
            ))}
          </div>
        </section>

        <aside className="room-aside">
          <section className="summary-card">
            <p className="eyebrow">ROOM DETAILS</p>
            <dl className="room-details-list">
              <div><dt>Building</dt><dd>{building?.name}</dd></div>
              <div><dt>Floor</dt><dd>{baseRoom.floor}</dd></div>
              <div><dt>Capacity</dt><dd>{baseRoom.capacity}</dd></div>
              <div><dt>Room type</dt><dd>{baseRoom.roomType}</dd></div>
              <div><dt>Entrance</dt><dd>Accessible</dd></div>
              <div><dt>Elevator</dt><dd>Available</dd></div>
            </dl>
          </section>
          <section className="summary-card outage-card">
            <div className="section-heading-row"><p className="eyebrow">TEMPORARY OUTAGES</p><span className="count-chip">0</span></div>
            <div className="empty-state-small"><CheckCircle2 size={22} /><strong>No active outages</strong><span>Last checked July 29 at 9:00 AM.</span></div>
          </section>
          <section className="summary-card">
            <p className="eyebrow">ASSIGNED CLASSES</p>
            <div className="assigned-class"><CalendarDays size={18} /><span><strong>CS-GY 6033</strong><small>Tue · Thu, 3:30–4:50 PM</small></span></div>
            <div className="assigned-class"><Clock3 size={18} /><span><strong>ECE-GY 5253</strong><small>Mon · Wed, 11:00 AM–12:20 PM</small></span></div>
          </section>
        </aside>
      </div>
      <p className="operational-note"><Building2 size={16} /> Changes to this record affect future operational checks. Authorised staff should confirm evidence before saving.</p>
    </div>
  );
}
