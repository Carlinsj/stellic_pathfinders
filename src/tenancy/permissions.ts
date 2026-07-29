import type { AppRole } from "../domain/types";

export type Permission =
  | "read_own_requirements"
  | "read_tenant_rooms"
  | "read_tenant_cases"
  | "manage_requirements"
  | "manage_rooms"
  | "manage_scheduling"
  | "manage_tenant_configuration"
  | "manage_university_metadata"
  | "read_private_student_data";

const permissions: Record<AppRole, ReadonlySet<Permission>> = {
  student: new Set(["read_own_requirements", "read_tenant_rooms"]),
  accessibility_coordinator: new Set([
    "read_tenant_rooms",
    "read_tenant_cases",
    "manage_requirements",
    "read_private_student_data",
  ]),
  facilities_staff: new Set(["read_tenant_rooms", "read_tenant_cases", "manage_rooms"]),
  scheduling_staff: new Set([
    "read_tenant_rooms",
    "read_tenant_cases",
    "manage_scheduling",
  ]),
  instructor: new Set(["read_tenant_rooms"]),
  university_admin: new Set([
    "read_tenant_rooms",
    "read_tenant_cases",
    "manage_tenant_configuration",
  ]),
  platform_admin: new Set(["manage_university_metadata"]),
  demo_admin: new Set([
    "read_tenant_rooms",
    "read_tenant_cases",
    "manage_requirements",
    "manage_rooms",
    "manage_scheduling",
    "manage_tenant_configuration",
    "read_private_student_data",
  ]),
};

export function can(role: AppRole, permission: Permission) {
  return permissions[role].has(permission);
}

export function assertTenantAccess(
  actorUniversityId: string | null,
  recordUniversityId: string,
  role: AppRole,
) {
  if (role === "platform_admin") {
    throw new Error("Platform administrators require an elevated support workflow.");
  }
  if (!actorUniversityId || actorUniversityId !== recordUniversityId) {
    throw new Error("Cross-tenant access denied.");
  }
}
