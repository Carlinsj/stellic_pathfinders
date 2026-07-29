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
import type { TenantConfig } from "../tenancy/types";

interface ProcessInput {
  student: Student;
  requirements: FunctionalRequirement[];
  course: CourseSection;
  previousRoom: Room;
  newRoom: Room;
  candidateRooms: Room[];
  effectiveAt: string;
  detectedAt?: string;
  tenant?: TenantConfig;
}

export function processRoomChange(input: ProcessInput) {
  const detectedAt = input.detectedAt ?? new Date().toISOString();
  const event: RoomChangeEvent = {
    id: `change-${input.previousRoom.id}-${input.newRoom.id}`,
    universityId: input.tenant?.id ?? input.student.universityId,
    previousRoomId: input.previousRoom.id,
    newRoomId: input.newRoom.id,
    sectionId: input.course.id,
    changedBy: `${input.tenant?.slug ?? "demo"}-admin`,
    effectiveAt: input.effectiveAt,
    detectedAt,
    reason: "Instructor-requested room update",
  };
  const compatibility = evaluateCompatibility({
    requirements: input.requirements,
    roomFeatures: input.newRoom.features,
    featureLabelMap: Object.fromEntries(
      input.tenant?.featureCatalogue.map((feature) => [feature.key, feature.displayName]) ?? [],
    ),
    evaluatedAt: detectedAt,
  });
  const alternatives = rankAlternativeRooms({
    rooms: input.candidateRooms,
    requirements: input.requirements,
    course: input.course,
    currentRoom: input.previousRoom,
    featureLabelMap: Object.fromEntries(
      input.tenant?.featureCatalogue.map((feature) => [feature.key, feature.displayName]) ?? [],
    ),
    evaluatedAt: detectedAt,
  });
  const proposed = alternatives.find((candidate) => candidate.eligible)?.room;
  const remediationCase: RemediationCase | undefined =
    compatibility.status === "incompatible"
      ? {
          id: input.tenant?.scenario.caseId ?? "RR-1042",
          universityId: input.tenant?.id ?? input.student.universityId,
          compatibilityCheckId: `check-${input.student.id}-${input.newRoom.id}`,
          status: "open",
          assignedTeam:
            input.tenant?.terminology.accessibilityOfficeShort ??
            "Accessibility Operations",
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
