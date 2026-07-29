import type { AppRole } from "../domain/types";
import { assertTenantAccess } from "./permissions";

export interface TenantRecord {
  universityId: string;
}

export function filterTenantRecords<T extends TenantRecord>(
  records: readonly T[],
  actorUniversityId: string | null,
  role: AppRole,
) {
  if (!actorUniversityId) {
    if (role === "platform_admin") return [];
    throw new Error("A tenant identity is required.");
  }
  return records.filter((record) => record.universityId === actorUniversityId);
}

export function updateTenantRecord<T extends TenantRecord>(
  record: T,
  actorUniversityId: string | null,
  role: AppRole,
  update: Partial<T>,
) {
  assertTenantAccess(actorUniversityId, record.universityId, role);
  if (update.universityId && update.universityId !== record.universityId) {
    throw new Error("A record cannot be moved across tenant boundaries.");
  }
  return { ...record, ...update };
}
