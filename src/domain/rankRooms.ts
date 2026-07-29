import { evaluateCompatibility, STALE_AFTER_DAYS } from "./compatibilityEngine";
import type {
  CourseSection,
  FunctionalRequirement,
  RankedRoom,
  Room,
} from "./types";

interface RankInput {
  rooms: Room[];
  requirements: FunctionalRequirement[];
  course: CourseSection;
  currentRoom: Room;
  evaluatedAt?: string;
}

export function rankAlternativeRooms({
  rooms,
  requirements,
  course,
  currentRoom,
  evaluatedAt = new Date().toISOString(),
}: RankInput): RankedRoom[] {
  return rooms
    .map<RankedRoom>((room) => {
      const compatibility = evaluateCompatibility({
        requirements,
        roomFeatures: room.features,
        evaluatedAt,
      });
      const eligible = compatibility.status === "compatible" && room.scheduleAvailable;
      const ageDays =
        Math.abs(new Date(evaluatedAt).getTime() - new Date(room.verifiedAt).getTime()) /
        86_400_000;
      const breakdown = {
        scheduling: room.scheduleAvailable ? 25 : 0,
        capacity: room.capacity >= course.enrollment ? 20 : 0,
        sameBuilding: room.buildingId === currentRoom.buildingId ? 15 : 0,
        travel: Math.max(0, 15 - Math.round(room.distanceMeters / 20)),
        freshness: ageDays <= STALE_AFTER_DAYS ? 15 : 5,
        disruption: Math.max(0, 10 - room.disruptionScore),
      };
      const score = eligible
        ? Object.values(breakdown).reduce((total, value) => total + value, 0)
        : 0;
      const rationale = eligible
        ? [
            "Satisfies every active required feature",
            room.scheduleAvailable
              ? "Available during the scheduled class time"
              : "Scheduling conflict",
            room.capacity >= course.enrollment
              ? `Fits all ${course.enrollment} enrolled students`
              : `Capacity is below ${course.enrollment}`,
            room.buildingId === currentRoom.buildingId
              ? "Keeps the class in the same building"
              : "Requires a building change",
            `${room.distanceMeters} m from the current room`,
          ]
        : [
            compatibility.status !== "compatible"
              ? `${compatibility.failed.length + compatibility.unknown.length} required feature${compatibility.failed.length + compatibility.unknown.length === 1 ? "" : "s"} unresolved`
              : "Unavailable at the scheduled class time",
            "Excluded from recommendation ranking",
          ];

      return { room, compatibility, eligible, score, breakdown, rationale };
    })
    .sort(
      (a, b) =>
        Number(b.eligible) - Number(a.eligible) ||
        b.score - a.score ||
        a.room.roomNumber.localeCompare(b.room.roomNumber),
    );
}
