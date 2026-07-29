export const featureTypes = [
  "adjustable_desk",
  "arm_free_chair",
  "step_free_student_area",
  "step_free_instruction_area",
  "integrated_accessible_seating",
  "assistive_listening",
  "electrical_outlet",
  "mobility_device_space",
  "accessible_lab_station",
  "low_distraction_location",
] as const;

export type FeatureType = (typeof featureTypes)[number];
export type Availability =
  | "available"
  | "unavailable"
  | "unknown"
  | "temporarily_unavailable";
export type CompatibilityStatus =
  | "compatible"
  | "incompatible"
  | "verification_required";

export interface FunctionalRequirement {
  id: string;
  studentId: string;
  featureType: FeatureType;
  requirementLevel: "required" | "preferred";
  notesVisibleToCoordinator?: string;
  active: boolean;
  createdAt: string;
}

export interface RoomFeature {
  roomId: string;
  featureType: FeatureType;
  availability: Availability;
  quantity?: number;
  verificationSource: string;
  verifiedAt: string;
  notes?: string;
}

export interface Building {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

export interface Room {
  id: string;
  buildingId: string;
  roomNumber: string;
  capacity: number;
  floor: number;
  roomType: string;
  verifiedAt: string;
  verificationStatus: "verified" | "needs_review";
  distanceMeters: number;
  features: RoomFeature[];
  scheduleAvailable: boolean;
  disruptionScore: number;
}

export interface RequirementResult {
  featureType: FeatureType;
  label: string;
  reason: string;
  availability: Availability | "not_recorded";
  stale: boolean;
  required: boolean;
}

export interface CompatibilityResult {
  status: CompatibilityStatus;
  passed: RequirementResult[];
  failed: RequirementResult[];
  unknown: RequirementResult[];
  preferences: RequirementResult[];
  hasStaleData: boolean;
  recommendedAction: string;
  explanation: string;
  evaluatedAt: string;
  engineVersion: string;
}

export interface Student {
  id: string;
  email: string;
  fullName: string;
  role: "student";
}

export interface CourseSection {
  id: string;
  courseCode: string;
  title: string;
  section: string;
  instructor: string;
  instructorEmail: string;
  meetingDays: string;
  startTime: string;
  endTime: string;
  enrollment: number;
}

export interface RankingBreakdown {
  scheduling: number;
  capacity: number;
  sameBuilding: number;
  travel: number;
  freshness: number;
  disruption: number;
}

export interface RankedRoom {
  room: Room;
  compatibility: CompatibilityResult;
  eligible: boolean;
  score: number;
  breakdown: RankingBreakdown;
  rationale: string[];
}

export interface RoomChangeEvent {
  id: string;
  previousRoomId: string;
  newRoomId: string;
  sectionId: string;
  changedBy: string;
  effectiveAt: string;
  detectedAt: string;
  reason: string;
}

export interface RemediationCase {
  id: string;
  compatibilityCheckId: string;
  status: "open" | "in_review" | "awaiting_verification" | "resolved";
  assignedTeam: string;
  proposedRoomId?: string;
  resolution?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface NotificationMessage {
  id: string;
  audience: "instructor" | "facilities" | "student" | "administrator";
  subject: string;
  body: string;
}

export const featureLabels: Record<FeatureType, string> = {
  adjustable_desk: "Height-adjustable accessible desk",
  arm_free_chair: "Arm-free chair",
  step_free_student_area: "Step-free route to student seating",
  step_free_instruction_area: "Step-free access to the instructional area",
  integrated_accessible_seating: "Accessible seating integrated with classmates",
  assistive_listening: "Assistive-listening equipment",
  electrical_outlet: "Reachable electrical outlet",
  mobility_device_space: "Space for a mobility device",
  accessible_lab_station: "Accessible laboratory station",
  low_distraction_location: "Low-distraction location",
};
