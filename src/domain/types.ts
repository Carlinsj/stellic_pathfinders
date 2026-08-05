export type TenantSlug = 'nyu';
export type Role = 'student' | 'recreation_staff' | 'university_admin' | 'demo_admin' | 'platform_admin';
export type PrivacyLevel = 'anonymous_aggregate' | 'friends_only' | 'private';
export type VisitStatus = 'planned' | 'delayed' | 'checked_in' | 'completed' | 'cancelled' | 'expired' | 'auto_closed';
export type VisitIntent = 'workout' | 'activity';
export type CrowdLevel = 'low' | 'moderate' | 'busy' | 'very_busy' | 'unknown';
export type Confidence = 'low' | 'medium' | 'high';
export type DemandLevel = 'low' | 'moderate' | 'high' | 'very_high' | 'unknown';

export interface University {
  id: string;
  slug: TenantSlug;
  name: string;
  shortName: string;
  mark: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  timezone: string;
  emailDomain: string;
  recreationOfficeName: string;
  privacyCountThreshold: number;
  autoCloseGraceMinutes: number;
}

export interface OperatingHours {
  weekday: number;
  openingTime: string;
  closingTime: string;
  closureReason?: string;
}

export interface Facility {
  id: string;
  universityId: string;
  name: string;
  shortName: string;
  address: string;
  description: string;
  capacity: number;
  travelMinutes: number;
  activities: string[];
  hours: OperatingHours[];
  baselineByHour: Record<number, number>;
  specialClosure?: { startsAt: string; endsAt: string; reason: string };
}

export interface EquipmentType {
  id: string;
  key: string;
  displayName: string;
  category: string;
  supportedFocuses: string[];
  defaultUsageMinutes: number;
}

export interface FacilityEquipment {
  universityId: string;
  facilityId: string;
  equipmentTypeId: string;
  totalQuantity: number;
  operationalQuantity: number;
  outageReason?: string;
}

export interface UserProfile {
  id: string;
  universityId: string;
  fullName: string;
  email: string;
  role: Role;
  preferredFacilityId?: string;
  defaultPrivacyLevel: PrivacyLevel;
}

export interface Visit {
  id: string;
  universityId: string;
  userId: string;
  userDisplayName?: string;
  facilityId: string;
  status: VisitStatus;
  source: 'planned' | 'spontaneous' | 'staff_import' | 'demo';
  intent: VisitIntent;
  plannedArrivalAt?: string;
  originalPlannedArrivalAt?: string;
  checkedInAt?: string;
  checkedOutAt?: string;
  expectedDurationMinutes: number;
  expectedEndAt?: string;
  autoCloseAt?: string;
  lastActivityAt?: string;
  primaryWorkoutFocus?: string;
  secondaryFocuses: string[];
  activity?: string;
  equipmentNeeds: string[];
  privacyLevel: PrivacyLevel;
  crowdFeedback?: 'less_crowded_than_expected' | 'about_as_expected' | 'more_crowded_than_expected';
  reliabilityWeight: number;
  createdAt: string;
  updatedAt: string;
}

export interface VisitHistoryEntry {
  id: string;
  visitId: string;
  previousStatus?: VisitStatus;
  newStatus: VisitStatus;
  reason: string;
  changedAt: string;
}

export interface LiveAggregate {
  facilityId: string;
  campusFitCheckIns: number;
  crowdLevel: CrowdLevel;
  confidence: Confidence;
  focusCounts: Array<{ key: string; label: string; count?: number; suppressed: boolean }>;
  activityCounts: Array<{ key: string; label: string; count?: number; suppressed: boolean }>;
  updatedAt: string;
  sourceExplanation: string;
  discountedAutoClosed: number;
}

export interface Forecast {
  facilityId: string;
  intervalStart: string;
  intervalEnd: string;
  expectedRange: [number, number];
  crowdLevel: CrowdLevel;
  confidence: Confidence;
  sourceExplanation: string;
  drivers: string[];
  plannedCount: number;
}

export interface EquipmentDemand {
  equipmentTypeId: string;
  displayName: string;
  demandLevel: DemandLevel;
  queueRange: [number, number];
  confidence: Confidence;
  explanation: string;
  operationalQuantity: number;
}

export type EquipmentAvailabilityLevel = 'available' | 'limited' | 'unavailable';

export interface WorkoutEquipmentAvailability {
  equipmentTypeId: string;
  displayName: string;
  totalQuantity: number;
  operationalQuantity: number;
  unavailableQuantity: number;
  availability: EquipmentAvailabilityLevel;
  relevanceWeight: number;
  statusText: string;
  impact: string;
}

export interface DurationEstimate {
  durationRange: [number, number];
  additionalWaitRange: [number, number];
  delayCauses: string[];
  confidence: Confidence;
}

export interface FacilityRecommendation {
  facility: Facility;
  score: number;
  forecast: Forecast;
  equipmentDemand: EquipmentDemand[];
  duration: DurationEstimate;
  eligible: boolean;
  explanation: string;
}

export interface DemoState {
  university: University;
  currentUser: UserProfile;
  facilities: Facility[];
  equipmentTypes: EquipmentType[];
  facilityEquipment: FacilityEquipment[];
  visits: Visit[];
  history: VisitHistoryEntry[];
  now: string;
}
