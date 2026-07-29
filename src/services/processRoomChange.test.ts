import { describe, expect, it } from "vitest";
import {
  course,
  effectiveAt,
  maya,
  mayaRequirements,
  roomById,
  rooms,
} from "../data/demoData";
import { initialDemoState } from "../state/DemoContext";
import { processRoomChange } from "./processRoomChange";

const run = () =>
  processRoomChange({
    student: maya,
    requirements: mayaRequirements,
    course,
    previousRoom: roomById("room-202"),
    newRoom: roomById("room-815"),
    candidateRooms: rooms.filter((room) => room.id !== "room-202"),
    effectiveAt,
    detectedAt: "2026-07-29T15:14:00.000Z",
  });

describe("room-change processing", () => {
  it("creates a compatibility check, case, recommendation, and notifications", () => {
    const result = run();
    expect(result.compatibility.status).toBe("incompatible");
    expect(result.remediationCase?.id).toBe("RR-1042");
    expect(result.remediationCase?.proposedRoomId).toBe("room-812");
    expect(result.notifications).toHaveLength(4);
    expect(result.auditEvents.map((event) => event.action)).toContain(
      "remediation_case_created",
    );
  });

  it("keeps instructor notifications privacy preserving", () => {
    const notice = run().notifications.find((message) => message.audience === "instructor");
    expect(notice?.body).not.toContain("Maya");
    expect(notice?.body).not.toContain("diagnosis");
    expect(notice?.body).not.toContain("adjustable desk");
    expect(notice?.body).toContain("approved classroom-access requirement");
  });

  it("restores the expected seed assignment on demo reset", () => {
    expect(initialDemoState).toMatchObject({
      hasRun: false,
      assignmentRoomId: "nyu-room-202",
      roomOverrides: {},
    });
  });
});
