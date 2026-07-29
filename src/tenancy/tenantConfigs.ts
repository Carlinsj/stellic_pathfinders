import type {
  Building,
  FeatureType,
  FunctionalRequirement,
  Room,
  RoomFeature,
} from "../domain/types";
import type {
  FeatureCatalogueEntry,
  NotificationTemplate,
  TenantConfig,
  WorkflowDefinition,
} from "./types";

const verifiedAt = "2026-07-18T14:00:00.000Z";

const conceptLabels: Record<FeatureType, { category: string; description: string }> = {
  adjustable_desk: {
    category: "Furniture",
    description: "A work surface with an adjustable height range.",
  },
  arm_free_chair: {
    category: "Furniture",
    description: "A stable classroom chair without fixed arms.",
  },
  step_free_student_area: {
    category: "Mobility access",
    description: "A step-free route from the entrance to student seating.",
  },
  step_free_instruction_area: {
    category: "Mobility access",
    description: "A step-free route to the instructional area.",
  },
  integrated_accessible_seating: {
    category: "Seating",
    description: "Accessible seating integrated with the main seating area.",
  },
  assistive_listening: {
    category: "Classroom technology",
    description: "An installed or portable assistive-listening system.",
  },
  electrical_outlet: {
    category: "Electrical access",
    description: "An electrical outlet reachable from the assigned seating area.",
  },
  mobility_device_space: {
    category: "Seating",
    description: "A clear, integrated space for a mobility device.",
  },
  accessible_lab_station: {
    category: "Laboratory access",
    description: "A laboratory station with an accessible work surface.",
  },
  low_distraction_location: {
    category: "Sensory environment",
    description: "A location with reduced nearby circulation and distraction.",
  },
};

function catalogue(
  universityId: string,
  labels: Partial<Record<FeatureType, [string, string]>>,
): FeatureCatalogueEntry[] {
  return Object.entries(labels).map(([key, [externalKey, displayName]], index) => ({
    id: `${universityId}-feature-${key}`,
    universityId,
    key: key as FeatureType,
    externalKey,
    displayName,
    description: conceptLabels[key as FeatureType].description,
    category: conceptLabels[key as FeatureType].category,
    dataType: "status",
    requiredVerificationFrequencyDays: key === "assistive_listening" ? 90 : 180,
    active: true,
    sortOrder: index + 1,
  }));
}

function roomFeature(
  roomId: string,
  featureType: FeatureType,
  availability: RoomFeature["availability"],
  notes?: string,
): RoomFeature {
  const universityId = roomId.startsWith("nyu") ? nyuId : uiucId;
  return {
    universityId,
    roomId,
    featureType,
    availability,
    quantity: availability === "available" ? 1 : 0,
    verificationSource: "Synthetic demo facilities walkthrough",
    verifiedAt,
    notes,
  };
}

function buildFeatures(
  roomId: string,
  keys: FeatureType[],
  overrides: Partial<Record<FeatureType, RoomFeature["availability"]>> = {},
): RoomFeature[] {
  return keys.map((key) =>
    roomFeature(roomId, key, overrides[key] ?? "available"),
  );
}

function requirementSet(
  tenant: "nyu" | "uiuc",
  studentId: string,
  keys: FeatureType[],
): FunctionalRequirement[] {
  return keys.map((featureType, index) => ({
    id: `${tenant}-requirement-${index + 1}`,
    universityId: tenant === "nyu" ? nyuId : uiucId,
    studentId,
    featureType,
    requirementLevel: "required",
    active: true,
    createdAt: "2026-01-12T15:00:00.000Z",
  }));
}

const nyuId = "11111111-1111-4111-8111-111111111111";
const uiucId = "22222222-2222-4222-8222-222222222222";

const nyuKeys: FeatureType[] = [
  "adjustable_desk",
  "step_free_student_area",
  "step_free_instruction_area",
  "integrated_accessible_seating",
  "electrical_outlet",
];

const uiucKeys: FeatureType[] = [
  "integrated_accessible_seating",
  "arm_free_chair",
  "electrical_outlet",
  "assistive_listening",
  "step_free_student_area",
];

const nyuBuildings: Building[] = [
  { id: "nyu-building-2mt", universityId: nyuId, name: "2 MetroTech Center", address: "Synthetic campus record · Brooklyn, NY", latitude: 40.6935, longitude: -73.9857 },
  { id: "nyu-building-6mt", universityId: nyuId, name: "6 MetroTech Center", address: "Synthetic campus record · Brooklyn, NY", latitude: 40.6941, longitude: -73.9852 },
  { id: "nyu-building-rogers", universityId: nyuId, name: "Rogers Hall Demo Annex", address: "Synthetic campus record · Brooklyn, NY", latitude: 40.6946, longitude: -73.9861 },
];

const uiucBuildings: Building[] = [
  { id: "uiuc-building-dcl", universityId: uiucId, name: "Digital Computer Laboratory", address: "Synthetic demo inventory · Urbana, IL", latitude: 40.1138, longitude: -88.2263 },
  { id: "uiuc-building-siebel", universityId: uiucId, name: "Siebel Center Demo Wing", address: "Synthetic demo inventory · Urbana, IL", latitude: 40.114, longitude: -88.2249 },
  { id: "uiuc-building-loomis", universityId: uiucId, name: "Loomis Laboratory Demo Wing", address: "Synthetic demo inventory · Urbana, IL", latitude: 40.1108, longitude: -88.2237 },
];

function makeRoom(
  id: string,
  buildingId: string,
  roomNumber: string,
  keys: FeatureType[],
  options: Partial<Room> & {
    overrides?: Partial<Record<FeatureType, RoomFeature["availability"]>>;
  } = {},
): Room {
  const { overrides, ...roomOptions } = options;
  const universityId = id.startsWith("nyu") ? nyuId : uiucId;
  return {
    id,
    universityId,
    buildingId,
    roomNumber,
    capacity: 48,
    floor: Number(roomNumber.match(/\d/)?.[0] ?? 1),
    roomType: "Flexible classroom",
    verifiedAt,
    verificationStatus: "verified",
    distanceMeters: 80,
    features: buildFeatures(id, keys, overrides),
    scheduleAvailable: true,
    disruptionScore: 3,
    ...roomOptions,
  };
}

const nyuRooms: Room[] = [
  makeRoom("nyu-room-202", "nyu-building-2mt", "202", nyuKeys, { capacity: 48, floor: 2, scheduleAvailable: false, distanceMeters: 0, disruptionScore: 0 }),
  makeRoom("nyu-room-815", "nyu-building-2mt", "815", nyuKeys, {
    capacity: 56,
    floor: 8,
    roomType: "Tiered lecture room",
    distanceMeters: 95,
    disruptionScore: 2,
    overrides: {
      adjustable_desk: "unavailable",
      step_free_instruction_area: "unavailable",
      integrated_accessible_seating: "unavailable",
      electrical_outlet: "unavailable",
    },
  }),
  makeRoom("nyu-room-812", "nyu-building-2mt", "812", nyuKeys, { capacity: 52, floor: 8, distanceMeters: 18, disruptionScore: 1 }),
  makeRoom("nyu-room-804", "nyu-building-2mt", "804", nyuKeys, { capacity: 44, floor: 8, distanceMeters: 52, verificationStatus: "needs_review", verifiedAt: "2025-10-10T14:00:00.000Z", overrides: { integrated_accessible_seating: "unknown" } }),
  makeRoom("nyu-room-606", "nyu-building-6mt", "606", nyuKeys, { capacity: 72, floor: 6, distanceMeters: 240, disruptionScore: 7 }),
  makeRoom("nyu-room-405", "nyu-building-2mt", "405", nyuKeys, { capacity: 38, floor: 4, distanceMeters: 110, disruptionScore: 4 }),
  makeRoom("nyu-room-310", "nyu-building-6mt", "310", nyuKeys, { capacity: 60, floor: 3, distanceMeters: 260 }),
  makeRoom("nyu-room-110", "nyu-building-rogers", "110", nyuKeys, { capacity: 70, floor: 1, distanceMeters: 410 }),
  makeRoom("nyu-room-214", "nyu-building-rogers", "214", nyuKeys, { capacity: 32, floor: 2, distanceMeters: 430 }),
  makeRoom("nyu-room-701", "nyu-building-6mt", "701", nyuKeys, { capacity: 80, floor: 7, distanceMeters: 280 }),
];

const uiucRooms: Room[] = [
  makeRoom("uiuc-room-dcl-1320", "uiuc-building-dcl", "DCL 1320", uiucKeys, { capacity: 52, floor: 1, scheduleAvailable: false, distanceMeters: 0, disruptionScore: 0 }),
  makeRoom("uiuc-room-dcl-1310", "uiuc-building-dcl", "DCL 1310", uiucKeys, {
    capacity: 64,
    floor: 1,
    roomType: "Fixed-seat classroom",
    distanceMeters: 38,
    disruptionScore: 2,
    overrides: {
      arm_free_chair: "unavailable",
      assistive_listening: "unknown",
      integrated_accessible_seating: "unavailable",
    },
  }),
  makeRoom("uiuc-room-dcl-1327", "uiuc-building-dcl", "DCL 1327", uiucKeys, { capacity: 58, floor: 1, distanceMeters: 14, disruptionScore: 1 }),
  makeRoom("uiuc-room-dcl-1304", "uiuc-building-dcl", "DCL 1304", uiucKeys, { capacity: 46, floor: 1, distanceMeters: 55, overrides: { assistive_listening: "temporarily_unavailable" } }),
  makeRoom("uiuc-room-siebel-1404", "uiuc-building-siebel", "SC 1404", uiucKeys, { capacity: 80, floor: 1, distanceMeters: 190, disruptionScore: 5 }),
  makeRoom("uiuc-room-siebel-2405", "uiuc-building-siebel", "SC 2405", uiucKeys, { capacity: 44, floor: 2, distanceMeters: 215 }),
  makeRoom("uiuc-room-loomis-141", "uiuc-building-loomis", "LL 141", uiucKeys, { capacity: 96, floor: 1, distanceMeters: 350, disruptionScore: 7 }),
  makeRoom("uiuc-room-loomis-144", "uiuc-building-loomis", "LL 144", uiucKeys, { capacity: 36, floor: 1, distanceMeters: 360 }),
  makeRoom("uiuc-room-dcl-2302", "uiuc-building-dcl", "DCL 2302", uiucKeys, { capacity: 72, floor: 2, distanceMeters: 70 }),
  makeRoom("uiuc-room-siebel-1302", "uiuc-building-siebel", "SC 1302", uiucKeys, { capacity: 50, floor: 1, distanceMeters: 180 }),
];

function templates(prefix: string): NotificationTemplate[] {
  return [
    {
      id: `${prefix}-student-alert`,
      audience: "student",
      subject: "We’re reviewing your {{course_code}} room change",
      body: "Hi {{student_first_name}}, {{accessibility_office_name}} is reviewing the move from {{original_room}} to {{replacement_room}}. {{missing_feature_count}} approved classroom features need action. We will confirm the final location before {{effective_date}}. Questions: {{support_email}}.",
    },
    {
      id: `${prefix}-instructor-notice`,
      audience: "instructor",
      subject: "Room review needed for {{course_code}}",
      body: "{{course_code}} was moved from {{original_room}} to {{replacement_room}}. The new assignment does not currently satisfy an approved classroom-access requirement. {{accessibility_office_name}} and the scheduling team are reviewing {{proposed_room}}. No student name, diagnosis, or complete requirement profile is included.",
    },
    {
      id: `${prefix}-accessibility-alert`,
      audience: "accessibility",
      subject: "Access continuity review · {{course_code}}",
      body: "Review {{missing_feature_count}} operational feature gaps for {{course_code}} and coordinate the next configured workflow step.",
    },
    {
      id: `${prefix}-facilities-request`,
      audience: "facilities",
      subject: "Verify room capabilities · {{replacement_room}}",
      body: "Verify the requirement-level room capability records for {{replacement_room}}. No diagnosis information is collected or disclosed.",
    },
    {
      id: `${prefix}-scheduling-recommendation`,
      audience: "scheduling",
      subject: "Compatible room recommendation · {{course_code}}",
      body: "After authorised review, replace {{replacement_room}} with {{proposed_room}} for {{course_code}}.",
    },
    {
      id: `${prefix}-resolution`,
      audience: "administrator",
      subject: "Resolution ready · {{course_code}}",
      body: "The configured workflow recommends {{proposed_room}}. Record approval and send the tenant-specific confirmation.",
    },
  ];
}

const nyuWorkflow: WorkflowDefinition = {
  id: "nyu-workflow-access-continuity",
  universityId: nyuId,
  name: "NYU access continuity response",
  version: 3,
  active: true,
  steps: [
    { id: "nyu-detect", type: "notify_role", label: "Incompatibility detected", ownerRole: "demo_admin" },
    { id: "nyu-coordinate", type: "require_coordinator_approval", label: "Moses Center coordinator reviews", ownerRole: "accessibility_coordinator" },
    { id: "nyu-schedule", type: "recommend_alternative_room", label: "University Programs proposes another room", ownerRole: "scheduling_staff" },
    { id: "nyu-instructor", type: "notify_instructor", label: "Instructor is notified", ownerRole: "instructor" },
    { id: "nyu-student", type: "notify_student", label: "Student receives confirmation", ownerRole: "accessibility_coordinator" },
  ],
};

const uiucWorkflow: WorkflowDefinition = {
  id: "uiuc-workflow-access-continuity",
  universityId: uiucId,
  name: "Illinois room access response",
  version: 2,
  active: true,
  steps: [
    { id: "uiuc-detect", type: "notify_role", label: "Incompatibility detected", ownerRole: "demo_admin" },
    { id: "uiuc-review", type: "require_coordinator_approval", label: "DRES reviews the impact", ownerRole: "accessibility_coordinator" },
    { id: "uiuc-verify", type: "request_room_verification", label: "Facilities verifies the missing feature", ownerRole: "facilities_staff" },
    { id: "uiuc-schedule", type: "require_scheduling_approval", label: "Classroom Scheduling selects a replacement", ownerRole: "scheduling_staff" },
    { id: "uiuc-confirm", type: "notify_student", label: "Student and instructor receive confirmation", ownerRole: "accessibility_coordinator" },
  ],
};

export const tenantConfigs: Record<"nyu" | "uiuc", TenantConfig> = {
  nyu: {
    id: nyuId,
    name: "New York University",
    shortName: "NYU",
    slug: "nyu",
    logoText: "NYU",
    timezone: "America/New_York",
    domain: "example.nyu.edu",
    supportEmail: "roomready-nyu@example.edu",
    escalationContact: "Demo accessibility operations lead",
    active: true,
    syntheticDataNotice: "Synthetic competition data; no university adoption or endorsement is implied.",
    theme: {
      primaryColour: "#57068C",
      secondaryColour: "#2D0A4E",
      accentColour: "#D7B9F7",
      surfaceTint: "#F7F1FB",
    },
    terminology: {
      accessibilityOffice: "Moses Center for Student Accessibility",
      accessibilityOfficeShort: "Moses Center",
      facilitiesOffice: "NYU Facilities Operations",
      schedulingOffice: "University Programs Scheduling",
      roomLabel: "classroom",
      caseLabel: "access continuity case",
    },
    featureCatalogue: catalogue(nyuId, {
      adjustable_desk: ["height_adjustable_student_desk", "Height-adjustable student desk"],
      step_free_student_area: ["step_free_student_seating", "Step-free route to student seating"],
      step_free_instruction_area: ["step_free_instruction_area", "Step-free access to the instructional area"],
      integrated_accessible_seating: ["integrated_accessible_seating", "Accessible seating integrated with classmates"],
      electrical_outlet: ["reachable_electrical_outlet", "Reachable electrical outlet"],
      assistive_listening: ["assistive_listening_system", "Assistive-listening equipment"],
      mobility_device_space: ["mobility_device_space", "Integrated mobility-device space"],
    }),
    workflow: nyuWorkflow,
    notificationTemplates: templates("nyu"),
    personas: [
      { id: "nyu-student-demo", universityId: nyuId, universitySlug: "nyu", role: "student", label: "NYU student demo", fullName: "Maya Chen" },
      { id: "nyu-admin-demo", universityId: nyuId, universitySlug: "nyu", role: "university_admin", label: "NYU administrator demo", fullName: "Alex Ortiz" },
    ],
    scenario: {
      student: { id: "nyu-student-maya", universityId: nyuId, email: "maya.chen@example.edu", fullName: "Maya Chen", role: "student" },
      requirements: requirementSet("nyu", "nyu-student-maya", nyuKeys),
      course: { id: "nyu-section-csgy6033-a", universityId: nyuId, courseCode: "CS-GY 6033", title: "Design and Analysis of Algorithms", section: "A", instructor: "Dr. Priya Raman", instructorEmail: "priya.raman@example.edu", meetingDays: "Tue · Thu", startTime: "3:30 PM", endTime: "4:50 PM", enrollment: 42 },
      buildings: nyuBuildings,
      rooms: nyuRooms,
      originalRoomId: "nyu-room-202",
      replacementRoomId: "nyu-room-815",
      recommendedRoomId: "nyu-room-812",
      effectiveAt: "2026-08-04T19:30:00.000Z",
      detectedAt: "2026-07-29T15:14:00.000Z",
      caseId: "NYU-RR-1042",
      verificationRequestRoomId: "nyu-room-804",
      openCaseLabel: "Room 815 access review",
      completedCaseLabel: "Room 704 relocation completed",
    },
  },
  uiuc: {
    id: uiucId,
    name: "University of Illinois Urbana-Champaign",
    shortName: "Illinois",
    slug: "uiuc",
    logoText: "I",
    timezone: "America/Chicago",
    domain: "example.illinois.edu",
    supportEmail: "roomready-uiuc@example.edu",
    escalationContact: "Demo DRES access specialist",
    active: true,
    syntheticDataNotice: "Synthetic competition data; no university adoption or endorsement is implied.",
    theme: {
      primaryColour: "#13294B",
      secondaryColour: "#B33A00",
      accentColour: "#FFB58A",
      surfaceTint: "#FFF5EF",
    },
    terminology: {
      accessibilityOffice: "Disability Resources and Educational Services",
      accessibilityOfficeShort: "DRES",
      facilitiesOffice: "Facilities & Services",
      schedulingOffice: "Classroom Scheduling",
      roomLabel: "instructional space",
      caseLabel: "room access review",
    },
    featureCatalogue: catalogue(uiucId, {
      integrated_accessible_seating: ["integrated_accessible_seating", "Accessible seating integrated with classmates"],
      arm_free_chair: ["arm_free_classroom_chair", "Arm-free classroom chair"],
      electrical_outlet: ["reachable_power_connection", "Reachable electrical connection"],
      assistive_listening: ["assistive_listening_system", "Assistive-listening system"],
      step_free_student_area: ["step_free_seating_route", "Step-free access to the seating area"],
      adjustable_desk: ["adjustable_accessible_workstation", "Adjustable accessible workstation"],
      low_distraction_location: ["reduced_distraction_seating", "Reduced-distraction seating location"],
    }),
    workflow: uiucWorkflow,
    notificationTemplates: templates("uiuc"),
    personas: [
      { id: "uiuc-student-demo", universityId: uiucId, universitySlug: "uiuc", role: "student", label: "UIUC student demo", fullName: "Jordan Patel" },
      { id: "uiuc-admin-demo", universityId: uiucId, universitySlug: "uiuc", role: "university_admin", label: "UIUC administrator demo", fullName: "Morgan Lee" },
    ],
    scenario: {
      student: { id: "uiuc-student-jordan", universityId: uiucId, email: "jordan.patel@example.edu", fullName: "Jordan Patel", role: "student" },
      requirements: requirementSet("uiuc", "uiuc-student-jordan", uiucKeys),
      course: { id: "uiuc-section-cs225-a", universityId: uiucId, courseCode: "CS 225", title: "Data Structures", section: "AL1", instructor: "Dr. Elena Brooks", instructorEmail: "elena.brooks@example.edu", meetingDays: "Mon · Wed", startTime: "2:00 PM", endTime: "3:20 PM", enrollment: 48 },
      buildings: uiucBuildings,
      rooms: uiucRooms,
      originalRoomId: "uiuc-room-dcl-1320",
      replacementRoomId: "uiuc-room-dcl-1310",
      recommendedRoomId: "uiuc-room-dcl-1327",
      effectiveAt: "2026-08-05T19:00:00.000Z",
      detectedAt: "2026-07-29T16:20:00.000Z",
      caseId: "ILL-RR-2077",
      verificationRequestRoomId: "uiuc-room-dcl-1310",
      openCaseLabel: "DCL 1310 capability review",
      completedCaseLabel: "SC 1404 verification completed",
    },
  },
};

export const getTenantConfig = (slug: string | undefined) =>
  slug === "uiuc" ? tenantConfigs.uiuc : slug === "nyu" ? tenantConfigs.nyu : undefined;

export const allTenantConfigs = Object.values(tenantConfigs);

export function roomForTenant(tenant: TenantConfig, id: string) {
  const room = tenant.scenario.rooms.find((candidate) => candidate.id === id);
  if (!room) throw new Error(`Unknown room ${id} for ${tenant.slug}`);
  return room;
}
