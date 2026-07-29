import type {
  AppRole,
  Building,
  CourseSection,
  FeatureType,
  FunctionalRequirement,
  Room,
  Student,
  UniversitySlug,
} from "../domain/types";

export type WorkflowStepType =
  | "notify_role"
  | "request_room_verification"
  | "request_facilities_action"
  | "recommend_alternative_room"
  | "require_coordinator_approval"
  | "require_scheduling_approval"
  | "notify_instructor"
  | "notify_student"
  | "mark_resolved";

export type WorkflowStepStatus =
  | "pending"
  | "active"
  | "blocked"
  | "completed"
  | "skipped"
  | "cancelled";

export interface FeatureCatalogueEntry {
  id: string;
  universityId: string;
  key: FeatureType;
  externalKey: string;
  displayName: string;
  description: string;
  category: string;
  dataType: "boolean" | "quantity" | "status";
  requiredVerificationFrequencyDays: number;
  active: boolean;
  sortOrder: number;
}

export interface WorkflowStepDefinition {
  id: string;
  type: WorkflowStepType;
  label: string;
  ownerRole: AppRole;
  optional?: boolean;
}

export interface WorkflowDefinition {
  id: string;
  universityId: string;
  name: string;
  version: number;
  active: boolean;
  steps: WorkflowStepDefinition[];
}

export interface NotificationTemplate {
  id: string;
  audience:
    | "student"
    | "instructor"
    | "accessibility"
    | "facilities"
    | "scheduling"
    | "administrator";
  subject: string;
  body: string;
}

export interface UniversityTheme {
  primaryColour: string;
  secondaryColour: string;
  accentColour: string;
  surfaceTint: string;
}

export interface TenantTerminology {
  accessibilityOffice: string;
  accessibilityOfficeShort: string;
  facilitiesOffice: string;
  schedulingOffice: string;
  roomLabel: string;
  caseLabel: string;
}

export interface DemoPersona {
  id: string;
  universityId: string;
  universitySlug: UniversitySlug;
  role: "student" | "university_admin";
  label: string;
  fullName: string;
}

export interface DemoScenario {
  student: Student;
  requirements: FunctionalRequirement[];
  course: CourseSection;
  buildings: Building[];
  rooms: Room[];
  originalRoomId: string;
  replacementRoomId: string;
  recommendedRoomId: string;
  effectiveAt: string;
  detectedAt: string;
  caseId: string;
  verificationRequestRoomId: string;
  openCaseLabel: string;
  completedCaseLabel: string;
}

export interface TenantConfig {
  id: string;
  name: string;
  shortName: string;
  slug: UniversitySlug;
  logoText: string;
  logoUrl?: string;
  timezone: string;
  domain: string;
  supportEmail: string;
  escalationContact: string;
  active: boolean;
  syntheticDataNotice: string;
  theme: UniversityTheme;
  terminology: TenantTerminology;
  featureCatalogue: FeatureCatalogueEntry[];
  workflow: WorkflowDefinition;
  notificationTemplates: NotificationTemplate[];
  personas: DemoPersona[];
  scenario: DemoScenario;
}

export interface TenantIdentity {
  universityId: string | null;
  universitySlug: UniversitySlug | null;
  role: AppRole;
}
