import { describe, expect, it } from "vitest";
import { evaluateCompatibility } from "./compatibilityEngine";
import type { FunctionalRequirement, RoomFeature } from "./types";

const now = "2026-07-29T15:00:00.000Z";
const fresh = "2026-07-18T15:00:00.000Z";

function requirement(
  featureType: FunctionalRequirement["featureType"],
  requirementLevel: FunctionalRequirement["requirementLevel"] = "required",
  active = true,
): FunctionalRequirement {
  return {
    id: featureType,
    universityId: "test-university",
    studentId: "student",
    featureType,
    requirementLevel,
    active,
    createdAt: now,
  };
}

function feature(
  featureType: RoomFeature["featureType"],
  availability: RoomFeature["availability"] = "available",
  verifiedAt = fresh,
): RoomFeature {
  return {
    universityId: "test-university",
    roomId: "room",
    featureType,
    availability,
    verificationSource: "test",
    verifiedAt,
  };
}

describe("evaluateCompatibility", () => {
  it("returns compatible when every required feature is available", () => {
    const result = evaluateCompatibility({
      requirements: [requirement("adjustable_desk"), requirement("electrical_outlet")],
      roomFeatures: [feature("adjustable_desk"), feature("electrical_outlet")],
      evaluatedAt: now,
    });
    expect(result.status).toBe("compatible");
    expect(result.passed).toHaveLength(2);
  });

  it("returns incompatible for one missing feature", () => {
    const result = evaluateCompatibility({
      requirements: [requirement("adjustable_desk")],
      roomFeatures: [feature("adjustable_desk", "unavailable")],
      evaluatedAt: now,
    });
    expect(result.status).toBe("incompatible");
    expect(result.failed[0]?.featureType).toBe("adjustable_desk");
  });

  it("explains several missing features", () => {
    const result = evaluateCompatibility({
      requirements: [
        requirement("adjustable_desk"),
        requirement("step_free_instruction_area"),
        requirement("electrical_outlet"),
      ],
      roomFeatures: [
        feature("adjustable_desk", "unavailable"),
        feature("step_free_instruction_area", "unavailable"),
        feature("electrical_outlet"),
      ],
      evaluatedAt: now,
    });
    expect(result.failed).toHaveLength(2);
    expect(result.explanation).toContain("2 failed");
  });

  it("requires verification for unknown room data", () => {
    const result = evaluateCompatibility({
      requirements: [requirement("assistive_listening")],
      roomFeatures: [feature("assistive_listening", "unknown")],
      evaluatedAt: now,
    });
    expect(result.status).toBe("verification_required");
    expect(result.unknown).toHaveLength(1);
  });

  it("treats temporarily unavailable as unavailable", () => {
    const result = evaluateCompatibility({
      requirements: [requirement("electrical_outlet")],
      roomFeatures: [feature("electrical_outlet", "temporarily_unavailable")],
      evaluatedAt: now,
    });
    expect(result.status).toBe("incompatible");
    expect(result.failed[0]?.reason).toContain("temporarily unavailable");
  });

  it("flags stale verification without changing an available result", () => {
    const result = evaluateCompatibility({
      requirements: [requirement("adjustable_desk")],
      roomFeatures: [feature("adjustable_desk", "available", "2025-01-01T00:00:00.000Z")],
      evaluatedAt: now,
    });
    expect(result.status).toBe("compatible");
    expect(result.hasStaleData).toBe(true);
    expect(result.passed[0]?.stale).toBe(true);
  });

  it("does not fail for an unavailable optional preference", () => {
    const result = evaluateCompatibility({
      requirements: [
        requirement("adjustable_desk"),
        requirement("low_distraction_location", "preferred"),
      ],
      roomFeatures: [
        feature("adjustable_desk"),
        feature("low_distraction_location", "unavailable"),
      ],
      evaluatedAt: now,
    });
    expect(result.status).toBe("compatible");
    expect(result.preferences[0]?.availability).toBe("unavailable");
  });

  it("passes when there are no active requirements", () => {
    const result = evaluateCompatibility({
      requirements: [requirement("adjustable_desk", "required", false)],
      roomFeatures: [],
      evaluatedAt: now,
    });
    expect(result.status).toBe("compatible");
    expect(result.explanation).toContain("No active required");
  });

  it("uses the safest deterministic result for duplicate feature records", () => {
    const result = evaluateCompatibility({
      requirements: [requirement("adjustable_desk")],
      roomFeatures: [
        feature("adjustable_desk", "available"),
        feature("adjustable_desk", "unavailable"),
      ],
      evaluatedAt: now,
    });
    expect(result.status).toBe("incompatible");
  });

  it("returns to compatible when a class moves back to a compatible room", () => {
    const failed = evaluateCompatibility({
      requirements: [requirement("adjustable_desk")],
      roomFeatures: [feature("adjustable_desk", "unavailable")],
      evaluatedAt: now,
    });
    const restored = evaluateCompatibility({
      requirements: [requirement("adjustable_desk")],
      roomFeatures: [feature("adjustable_desk", "available")],
      evaluatedAt: now,
    });
    expect(failed.status).toBe("incompatible");
    expect(restored.status).toBe("compatible");
  });

  it("is reproducible for identical inputs", () => {
    const input = {
      requirements: [requirement("adjustable_desk")],
      roomFeatures: [feature("adjustable_desk")],
      evaluatedAt: now,
    };
    expect(evaluateCompatibility(input)).toEqual(evaluateCompatibility(input));
  });
});
