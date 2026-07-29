import { describe, expect, it } from "vitest";
import { evaluateCompatibility } from "../domain/compatibilityEngine";
import { rankAlternativeRooms } from "../domain/rankRooms";
import { parseRoomCsv, roomCsvTemplate } from "../imports/roomCsv";
import { createNotificationMessages } from "../services/notifications";
import {
  completeActiveStep,
  createWorkflowInstance,
  reorderWorkflowStep,
} from "../workflows/workflowEngine";
import { filterTenantRecords, updateTenantRecord } from "./dataAccess";
import { can } from "./permissions";
import { resolveTenant } from "./tenantResolver";
import { tenantConfigs, roomForTenant } from "./tenantConfigs";
import { validateThemeColours } from "./theme";

describe("tenant resolution and security", () => {
  it("resolves both supported URL slugs", () => {
    expect(resolveTenant({ urlSlug: "nyu" })).toMatchObject({ status: "resolved", slug: "nyu" });
    expect(resolveTenant({ urlSlug: "uiuc" })).toMatchObject({ status: "resolved", slug: "uiuc" });
  });

  it("blocks a URL/profile university conflict", () => {
    const result = resolveTenant({
      urlSlug: "uiuc",
      user: {
        universityId: tenantConfigs.nyu.id,
        universitySlug: "nyu",
        role: "student",
      },
    });
    expect(result.status).toBe("blocked");
  });

  it("does not let a platform administrator read private student data", () => {
    expect(can("platform_admin", "manage_university_metadata")).toBe(true);
    expect(can("platform_admin", "read_private_student_data")).toBe(false);
    expect(() =>
      updateTenantRecord(
        tenantConfigs.nyu.scenario.student,
        null,
        "platform_admin",
        { fullName: "Changed" },
      ),
    ).toThrow(/elevated support workflow/);
  });

  it("filters room queries to the actor's university", () => {
    const allRooms = [
      ...tenantConfigs.nyu.scenario.rooms,
      ...tenantConfigs.uiuc.scenario.rooms,
    ];
    const nyuRooms = filterTenantRecords(allRooms, tenantConfigs.nyu.id, "student");
    expect(nyuRooms).toHaveLength(10);
    expect(nyuRooms.every((room) => room.universityId === tenantConfigs.nyu.id)).toBe(true);
    expect(nyuRooms.some((room) => room.roomNumber === "DCL 1320")).toBe(false);
  });

  it("rejects an administrator update across tenant boundaries", () => {
    expect(() =>
      updateTenantRecord(
        tenantConfigs.nyu.scenario.rooms[0]!,
        tenantConfigs.uiuc.id,
        "university_admin",
        { capacity: 100 },
      ),
    ).toThrow(/Cross-tenant/);
  });

  it("does not grant an instructor access to functional requirement profiles", () => {
    expect(can("instructor", "read_private_student_data")).toBe(false);
    expect(can("facilities_staff", "read_private_student_data")).toBe(false);
  });
});

describe("tenant configuration", () => {
  it("ships distinct accessible themes", () => {
    expect(tenantConfigs.nyu.theme.primaryColour).not.toBe(tenantConfigs.uiuc.theme.primaryColour);
    expect(
      validateThemeColours(
        tenantConfigs.nyu.theme.primaryColour,
        tenantConfigs.nyu.theme.secondaryColour,
      ).valid,
    ).toBe(true);
    expect(
      validateThemeColours(
        tenantConfigs.uiuc.theme.primaryColour,
        tenantConfigs.uiuc.theme.secondaryColour,
      ).valid,
    ).toBe(true);
  });

  it("maps different display labels to the same stable feature concept", () => {
    const nyu = tenantConfigs.nyu.featureCatalogue.find((item) => item.key === "adjustable_desk");
    const uiuc = tenantConfigs.uiuc.featureCatalogue.find((item) => item.key === "adjustable_desk");
    expect(nyu?.externalKey).toBe("height_adjustable_student_desk");
    expect(uiuc?.externalKey).toBe("adjustable_accessible_workstation");
    expect(nyu?.key).toBe(uiuc?.key);
  });

  it("contains complete isolated demo inventories", () => {
    for (const tenant of Object.values(tenantConfigs)) {
      expect(tenant.scenario.buildings.length).toBeGreaterThanOrEqual(3);
      expect(tenant.scenario.rooms.length).toBeGreaterThanOrEqual(10);
      expect(tenant.featureCatalogue.length).toBeGreaterThanOrEqual(6);
      expect(tenant.scenario.rooms.every((room) => room.universityId === tenant.id)).toBe(true);
    }
  });
});

describe("shared scenario engine", () => {
  for (const tenant of Object.values(tenantConfigs)) {
    it(`detects the ${tenant.slug} incompatibility and recommends its configured room`, () => {
      const scenario = tenant.scenario;
      const labelMap = Object.fromEntries(
        tenant.featureCatalogue.map((feature) => [feature.key, feature.displayName]),
      );
      const replacement = roomForTenant(tenant, scenario.replacementRoomId);
      const compatibility = evaluateCompatibility({
        requirements: scenario.requirements,
        roomFeatures: replacement.features,
        featureLabelMap: labelMap,
        evaluatedAt: scenario.detectedAt,
      });
      const ranking = rankAlternativeRooms({
        rooms: scenario.rooms.filter((room) => room.id !== scenario.originalRoomId),
        requirements: scenario.requirements,
        course: scenario.course,
        currentRoom: roomForTenant(tenant, scenario.originalRoomId),
        featureLabelMap: labelMap,
        evaluatedAt: scenario.detectedAt,
      });
      expect(compatibility.status).toBe("incompatible");
      expect(ranking[0]?.room.id).toBe(scenario.recommendedRoomId);
    });
  }
});

describe("workflow snapshots", () => {
  it("advances the next configured step", () => {
    const instance = createWorkflowInstance(tenantConfigs.uiuc.workflow, "instance");
    const advanced = completeActiveStep(instance);
    expect(advanced.steps[0]?.status).toBe("completed");
    expect(advanced.steps[1]?.status).toBe("active");
  });

  it("preserves a case definition snapshot after later reordering", () => {
    const definition = tenantConfigs.nyu.workflow;
    const instance = createWorkflowInstance(definition, "case-1");
    const changed = reorderWorkflowStep(definition, definition.steps[1]!.id, "down");
    expect(changed.version).toBe(definition.version + 1);
    expect(instance.definitionVersion).toBe(definition.version);
    expect(instance.definitionSnapshot.steps[1]?.id).toBe(definition.steps[1]?.id);
    expect(changed.steps[1]?.id).not.toBe(definition.steps[1]?.id);
  });
});

describe("tenant notifications and CSV import", () => {
  it("renders UIUC terminology without student identity in instructor notice", () => {
    const tenant = tenantConfigs.uiuc;
    const scenario = tenant.scenario;
    const messages = createNotificationMessages({
      student: scenario.student,
      course: scenario.course,
      previousRoom: roomForTenant(tenant, scenario.originalRoomId),
      newRoom: roomForTenant(tenant, scenario.replacementRoomId),
      proposedRoom: roomForTenant(tenant, scenario.recommendedRoomId),
      result: evaluateCompatibility({
        requirements: scenario.requirements,
        roomFeatures: roomForTenant(tenant, scenario.replacementRoomId).features,
      }),
      effectiveAt: scenario.effectiveAt,
      tenant,
    });
    const instructor = messages.find((message) => message.audience === "instructor");
    expect(instructor?.body).toContain("Disability Resources and Educational Services");
    expect(instructor?.body).not.toContain("Jordan");
    expect(instructor?.universityId).toBe(tenant.id);
  });

  it("accepts valid CSV rows while reporting invalid rows", () => {
    const csv = `${roomCsvTemplate}
Demo Hall,DH,DH 102,not-a-number,1,Flexible classroom,feature,available,2026-07-18,Walkthrough`;
    const result = parseRoomCsv(csv);
    expect(result.validRows).toHaveLength(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.row).toBe(3);
  });
});
