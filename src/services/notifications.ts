import type {
  CompatibilityResult,
  CourseSection,
  NotificationMessage,
  Room,
  Student,
} from "../domain/types";

interface NotificationInput {
  student: Student;
  course: CourseSection;
  previousRoom: Room;
  newRoom: Room;
  proposedRoom?: Room;
  result: CompatibilityResult;
  effectiveAt: string;
}

export interface NotificationAdapter {
  send(message: NotificationMessage): Promise<void>;
}

export class ConsoleNotificationAdapter implements NotificationAdapter {
  async send(message: NotificationMessage) {
    console.info(`[RoomReady:${message.audience}] ${message.subject}`);
  }
}

export function createNotificationMessages({
  student,
  course,
  previousRoom,
  newRoom,
  proposedRoom,
  effectiveAt,
}: NotificationInput): NotificationMessage[] {
  const deadline = new Date(effectiveAt).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return [
    {
      id: "notice-instructor",
      audience: "instructor",
      subject: `Room review needed for ${course.courseCode}`,
      body: `${course.courseCode} was moved from Room ${previousRoom.roomNumber} to Room ${newRoom.roomNumber}. The new assignment does not currently satisfy an approved classroom-access requirement. The Registrar and Accessibility teams own the next step and are reviewing ${proposedRoom ? `Room ${proposedRoom.roomNumber}` : "a compatible alternative"}. Please keep the current teaching plan flexible until the assignment is confirmed by ${deadline}. No action is required from you unless contacted.`,
    },
    {
      id: "notice-facilities",
      audience: "facilities",
      subject: `Capability verification requested · Room ${newRoom.roomNumber}`,
      body: `${course.courseCode} moved to Room ${newRoom.roomNumber}, and an operational room check found that the assignment does not meet all approved classroom-access requirements. Please verify the recorded room capabilities and any temporary outages. Facilities owns verification; respond before ${deadline}. Refer to case RR-1042 for the requirement-level checklist.`,
    },
    {
      id: "notice-student",
      audience: "student",
      subject: `We’re reviewing your ${course.courseCode} room change`,
      body: `Hi ${student.fullName.split(" ")[0]}, your ${course.courseCode} class moved from Room ${previousRoom.roomNumber} to Room ${newRoom.roomNumber}. RoomReady found that the new room does not carry forward all of your approved classroom features. The Accessibility and Registrar teams are reviewing ${proposedRoom ? `Room ${proposedRoom.roomNumber}` : "an alternative"} and will confirm the final location before ${deadline}. You do not need to disclose any additional information to your instructor.`,
    },
    {
      id: "notice-administrator",
      audience: "administrator",
      subject: `Recommended room change · ${course.courseCode}`,
      body: `Do not confirm Room ${newRoom.roomNumber}. Move ${course.courseCode} to ${proposedRoom ? `Room ${proposedRoom.roomNumber}` : "the highest-ranked fully compatible room"} after authorised staff review. The Registrar owns the final reassignment and should resolve case RR-1042 before ${deadline}.`,
    },
  ];
}
