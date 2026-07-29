import { ArrowRight, Building2, Check, MapPin, ShieldAlert, Users, X } from "lucide-react";
import { Link } from "react-router-dom";
import { Meter, PageHeader, StatusBadge } from "../components/ui";
import { course, mayaRequirements, roomById, rooms } from "../data/demoData";
import { rankAlternativeRooms } from "../domain/rankRooms";
import { useDemo } from "../state/DemoContext";

export function AlternativesPage() {
  const { result } = useDemo();
  const ranking =
    result?.alternatives ??
    rankAlternativeRooms({
      rooms: rooms.filter((room) => room.id !== "room-202"),
      requirements: mayaRequirements,
      course,
      currentRoom: roomById("room-202"),
      evaluatedAt: "2026-07-29T15:14:00.000Z",
    });
  const shown = ["room-812", "room-606", "room-804", "room-815"]
    .map((id) => ranking.find((item) => item.room.id === id))
    .filter((item) => item !== undefined);

  return (
    <div className="page">
      <PageHeader
        eyebrow="ALTERNATIVE-ROOM COMPARISON"
        title="A compatible room, ranked with reasons"
        description="Only rooms that meet every required feature and are available at class time can be recommended."
        actions={<Link className="button button-dark" to="/app/case">Open case <ArrowRight size={16} /></Link>}
      />

      <div className="ranking-explainer">
        <ShieldAlert size={19} />
        <p><strong>Hard requirements are a gate—not a score.</strong> A nearby room is never recommended if even one required feature is missing or unknown.</p>
      </div>

      <section className="candidate-grid">
        {shown.map((candidate, index) => (
          <article
            key={candidate.room.id}
            className={`candidate-card${candidate.room.id === "room-812" ? " recommended" : ""}`}
          >
            {candidate.room.id === "room-812" && (
              <div className="recommended-ribbon">Best compatible alternative</div>
            )}
            <div className="candidate-heading">
              <div>
                <p className="eyebrow">{candidate.eligible ? `RANK ${index + 1}` : "NOT ELIGIBLE"}</p>
                <h2>Room {candidate.room.roomNumber}</h2>
              </div>
              <StatusBadge status={candidate.compatibility.status} compact />
            </div>
            <div className="candidate-facts">
              <span><Users size={16} /><strong>{candidate.room.capacity}</strong> seats</span>
              <span><MapPin size={16} /><strong>{candidate.room.distanceMeters} m</strong> away</span>
              <span><Building2 size={16} /><strong>Floor {candidate.room.floor}</strong></span>
            </div>
            {candidate.eligible ? (
              <>
                <div className="score-line"><span>Recommendation score</span><strong>{candidate.score}/100</strong></div>
                <Meter score={candidate.score} />
              </>
            ) : (
              <div className="excluded-line"><X size={16} /> Excluded from ranking</div>
            )}
            <ul className="rationale-list">
              {candidate.rationale.map((reason, reasonIndex) => (
                <li key={reason}><span>{reasonIndex + 1}</span>{reason}</li>
              ))}
            </ul>
            <div className="candidate-footer">
              <span><strong>{candidate.compatibility.passed.length}/5</strong> requirements met</span>
              <span>Verified {candidate.room.verificationStatus === "verified" ? "11 days ago" : "292 days ago"}</span>
            </div>
          </article>
        ))}
      </section>

      <section className="score-breakdown">
        <div>
          <p className="eyebrow">WHY ROOM 812 RANKS FIRST</p>
          <h2>Strong on access. Low on disruption.</h2>
          <p>The score is calculated from operational factors only after all required features pass.</p>
        </div>
        {[
          ["Scheduled availability", 25, 25],
          ["Appropriate capacity", 20, 20],
          ["Same building", 15, 15],
          ["Travel distance", 14, 15],
          ["Verification freshness", 15, 15],
          ["Minimal disruption", 9, 10],
        ].map(([label, score, max]) => (
          <div className="breakdown-row" key={String(label)}>
            <span className="breakdown-check"><Check size={15} /></span>
            <span>{label}</span>
            <div className="breakdown-track"><span style={{ width: `${(Number(score) / Number(max)) * 100}%` }} /></div>
            <strong>{score}/{max}</strong>
          </div>
        ))}
      </section>
    </div>
  );
}
