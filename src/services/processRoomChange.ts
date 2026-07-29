import { evaluateCompatibility } from "../domain/compatibilityEngine";
import { rankAlternativeRooms } from "../domain/rankRooms";
import type {
  CourseSection,
  FunctionalRequirement,
  RemediationCase,
  Room,
  RoomChangeEvent,
  Student,
} from "../domain/types";
import { createNotificationMessages } from "./notifications";

interface ProcessInput {
  student: Student;
  requirements: FunctionalRequirement[];
  course: CourseSection;
  previousRoom: Room;
  newRoom: Room;
  candidateRooms: Room[];
  effectiveAt: string;
  detectedAt?: string;
}

export function processRoomChange(input: ProcessInput) {
  const detectedAt = input.detectedAt ?? new Date().toISOString();
  const event: RoomChangeEvent = {
    id: "change-202-815",
    previousRoomId: input.previousRoom.id,
    newRoomId: input.newRoom.id,
    sectionId: input.course.id,
    changedBy: "demo-admin",
    effectiveAt: input.effectiveAt,
    detectedAt,
    reason: "Instructor-requested room update",
  };
  const compatibility = evaluateCompatibility({
    requirements: input.requirements,
    roomFeatures: input.newRoom.features,
    evaluatedAt: detectedAt,
  });
  const alternatives = rankAlternativeRooms({
    rooms: input.candidateRooms,
    requirements: input.requirements,
    course: input.course,
    currentRoom: input.previousRoom,
    evaluatedAt: detectedAt,
  });
  const proposed = alternatives.find((candidate) => candidate.eligible)?.room;
  const remediationCase: RemediationCase | undefined =
    compatibility.status === "incompatible"
      ? {
          id: "RR-1042",
          compatibilityCheckId: "check-maya-815",
          status: "open",
          assignedTeam: "Accessibility Operations",
          proposedRoomId: proposed?.id,
          createdAt: detectedAt,
        }
      : undefined;
  const notifications = createNotificationMessages({
    ...input,
    proposedRoom: proposed,
    result: compatibility,
  });

  return {
    event,
    compatibility,
    alternatives,
    remediationCase,
    notifications,
    auditEvents: [
      { action: "room_change_detected", at: detectedAt, actor: "demo-admin" },
      { action: "compatibility_check_completed", at: detectedAt, actor: "system" },
      ...(remediationCase
        ? [{ action: "remediation_case_created", at: detectedAt, actor: "system" }]
        : []),
    ],
  };
}
