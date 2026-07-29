import type {
  Building,
  CourseSection,
  FunctionalRequirement,
  Room,
  RoomFeature,
  Student,
} from "../domain/types";

const verifiedAt = "2026-07-18T14:00:00.000Z";
const roomFeature = (
  roomId: string,
  featureType: RoomFeature["featureType"],
  availability: RoomFeature["availability"],
  notes?: string,
): RoomFeature => ({
  roomId,
  featureType,
  availability,
  quantity: availability === "available" ? 1 : 0,
  verificationSource: "Facilities walkthrough",
  verifiedAt,
  notes,
});

export const maya: Student = {
  id: "student-maya",
  email: "maya.chen@example.edu",
  fullName: "Maya Chen",
  role: "student",
};

export const buildings: Building[] = [
  {
    id: "building-2",
    name: "2 MetroTech Center",
    address: "2 MetroTech Center, Brooklyn, NY",
    latitude: 40.6935,
    longitude: -73.9857,
  },
  {
    id: "building-6",
    name: "6 MetroTech Center",
    address: "6 MetroTech Center, Brooklyn, NY",
    latitude: 40.6941,
    longitude: -73.9852,
  },
];

export const mayaRequirements: FunctionalRequirement[] = [
  "adjustable_desk",
  "step_free_student_area",
  "step_free_instruction_area",
  "integrated_accessible_seating",
  "electrical_outlet",
].map((featureType, index) => ({
  id: `maya-requirement-${index + 1}`,
  studentId: maya.id,
  featureType: featureType as FunctionalRequirement["featureType"],
  requirementLevel: "required",
  active: true,
  createdAt: "2026-01-12T15:00:00.000Z",
}));

export const course: CourseSection = {
  id: "section-csgy6033-a",
  courseCode: "CS-GY 6033",
  title: "Design and Analysis of Algorithms",
  section: "A",
  instructor: "Dr. Priya Raman",
  instructorEmail: "priya.raman@example.edu",
  meetingDays: "Tue · Thu",
  startTime: "3:30 PM",
  endTime: "4:50 PM",
  enrollment: 42,
};

const allRequiredAvailable = (roomId: string): RoomFeature[] =>
  mayaRequirements.map((requirement) =>
    roomFeature(roomId, requirement.featureType, "available"),
  );

export const rooms: Room[] = [
  {
    id: "room-202",
    buildingId: "building-2",
    roomNumber: "202",
    capacity: 48,
    floor: 2,
    roomType: "Lecture classroom",
    verifiedAt,
    verificationStatus: "verified",
    distanceMeters: 0,
    features: allRequiredAvailable("room-202"),
    scheduleAvailable: false,
    disruptionScore: 0,
  },
  {
    id: "room-815",
    buildingId: "building-2",
    roomNumber: "815",
    capacity: 56,
    floor: 8,
    roomType: "Tiered lecture room",
    verifiedAt,
    verificationStatus: "verified",
    distanceMeters: 95,
    features: [
      roomFeature("room-815", "adjustable_desk", "unavailable"),
      roomFeature("room-815", "step_free_student_area", "available"),
      roomFeature(
        "room-815",
        "step_free_instruction_area",
        "unavailable",
        "The instructional platform is reached by two steps.",
      ),
      roomFeature(
        "room-815",
        "integrated_accessible_seating",
        "unavailable",
        "The accessible position is separated from the main seating rows.",
      ),
      roomFeature(
        "room-815",
        "electrical_outlet",
        "unavailable",
        "Outlets are present but not reachable from accessible seating.",
      ),
    ],
    scheduleAvailable: true,
    disruptionScore: 2,
  },
  {
    id: "room-812",
    buildingId: "building-2",
    roomNumber: "812",
    capacity: 52,
    floor: 8,
    roomType: "Flexible classroom",
    verifiedAt,
    verificationStatus: "verified",
    distanceMeters: 18,
    features: allRequiredAvailable("room-812"),
    scheduleAvailable: true,
    disruptionScore: 1,
  },
  {
    id: "room-804",
    buildingId: "building-2",
    roomNumber: "804",
    capacity: 44,
    floor: 8,
    roomType: "Seminar room",
    verifiedAt: "2025-10-10T14:00:00.000Z",
    verificationStatus: "needs_review",
    distanceMeters: 52,
    features: [
      ...allRequiredAvailable("room-804").filter(
        (feature) => feature.featureType !== "integrated_accessible_seating",
      ),
      roomFeature("room-804", "integrated_accessible_seating", "unknown"),
    ],
    scheduleAvailable: true,
    disruptionScore: 2,
  },
  {
    id: "room-606",
    buildingId: "building-6",
    roomNumber: "606",
    capacity: 72,
    floor: 6,
    roomType: "Lecture classroom",
    verifiedAt,
    verificationStatus: "verified",
    distanceMeters: 240,
    features: allRequiredAvailable("room-606"),
    scheduleAvailable: true,
    disruptionScore: 7,
  },
  {
    id: "room-405",
    buildingId: "building-2",
    roomNumber: "405",
    capacity: 38,
    floor: 4,
    roomType: "Active learning room",
    verifiedAt,
    verificationStatus: "verified",
    distanceMeters: 110,
    features: allRequiredAvailable("room-405"),
    scheduleAvailable: true,
    disruptionScore: 4,
  },
];

export const roomById = (id: string) => {
  const room = rooms.find((candidate) => candidate.id === id);
  if (!room) throw new Error(`Unknown room: ${id}`);
  return room;
};

export const effectiveAt = "2026-08-04T19:30:00.000Z";
export const detectedAt = "2026-07-29T15:14:00.000Z";
