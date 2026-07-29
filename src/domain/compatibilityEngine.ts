import {
  featureLabels,
  type Availability,
  type CompatibilityResult,
  type FunctionalRequirement,
  type RequirementResult,
  type RoomFeature,
} from "./types";

export const ENGINE_VERSION = "1.0.0";
export const STALE_AFTER_DAYS = 180;

interface EvaluateInput {
  requirements: FunctionalRequirement[];
  roomFeatures: RoomFeature[];
  featureLabelMap?: Partial<Record<FunctionalRequirement["featureType"], string>>;
  evaluatedAt?: string;
  staleAfterDays?: number;
}

const availabilityPriority: Record<Availability, number> = {
  temporarily_unavailable: 4,
  unavailable: 3,
  unknown: 2,
  available: 1,
};

function daysBetween(a: Date, b: Date) {
  return Math.abs(a.getTime() - b.getTime()) / 86_400_000;
}

function selectFeature(records: RoomFeature[]): RoomFeature | undefined {
  return [...records].sort((a, b) => {
    const availabilityDifference =
      availabilityPriority[b.availability] - availabilityPriority[a.availability];
    if (availabilityDifference !== 0) return availabilityDifference;
    return b.verifiedAt.localeCompare(a.verifiedAt);
  })[0];
}

function resultReason(
  availability: Availability | "not_recorded",
  label: string,
  notes?: string,
) {
  switch (availability) {
    case "available":
      return `${label} is recorded as available.${notes ? ` ${notes}` : ""}`;
    case "temporarily_unavailable":
      return `${label} is temporarily unavailable and cannot be relied on for this class.`;
    case "unavailable":
      return `${label} is not available in the assigned room.${notes ? ` ${notes}` : ""}`;
    case "unknown":
    case "not_recorded":
      return `${label} has not been verified for the assigned room.`;
  }
}

export function evaluateCompatibility({
  requirements,
  roomFeatures,
  featureLabelMap,
  evaluatedAt = new Date().toISOString(),
  staleAfterDays = STALE_AFTER_DAYS,
}: EvaluateInput): CompatibilityResult {
  const active = requirements
    .filter((requirement) => requirement.active)
    .sort((a, b) => a.featureType.localeCompare(b.featureType));
  const evaluatedDate = new Date(evaluatedAt);

  const results = active.map<RequirementResult>((requirement) => {
    const candidates = roomFeatures.filter(
      (feature) => feature.featureType === requirement.featureType,
    );
    const selected = selectFeature(candidates);
    const availability = selected?.availability ?? "not_recorded";
    const stale = selected
      ? daysBetween(evaluatedDate, new Date(selected.verifiedAt)) > staleAfterDays
      : false;

    const label = featureLabelMap?.[requirement.featureType] ?? featureLabels[requirement.featureType];
    return {
      featureType: requirement.featureType,
      label,
      availability,
      stale,
      required: requirement.requirementLevel === "required",
      reason: resultReason(availability, label, selected?.notes),
    };
  });

  const required = results.filter((result) => result.required);
  const failed = required.filter(
    (result) =>
      result.availability === "unavailable" ||
      result.availability === "temporarily_unavailable",
  );
  const unknown = required.filter(
    (result) =>
      result.availability === "unknown" || result.availability === "not_recorded",
  );
  const passed = required.filter((result) => result.availability === "available");
  const preferences = results.filter((result) => !result.required);
  const status =
    failed.length > 0
      ? "incompatible"
      : unknown.length > 0
        ? "verification_required"
        : "compatible";
  const hasStaleData = results.some((result) => result.stale);

  const recommendedAction =
    status === "incompatible"
      ? "Review a fully compatible alternative room before confirming the reassignment."
      : status === "verification_required"
        ? "Ask facilities to verify the unknown room features before the class meets."
        : "No remediation is required; retain the operational record.";

  const explanation =
    required.length === 0
      ? "No active required classroom features were present, so the room passes this operational check."
      : `${passed.length} of ${required.length} required features passed; ${failed.length} failed and ${unknown.length} need verification.`;

  return {
    status,
    passed,
    failed,
    unknown,
    preferences,
    hasStaleData,
    recommendedAction,
    explanation,
    evaluatedAt,
    engineVersion: ENGINE_VERSION,
  };
}
