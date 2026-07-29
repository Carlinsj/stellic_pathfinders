/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import type {
  NotificationMessage,
  RemediationCase,
  RoomFeature,
} from "../domain/types";
import { processRoomChange } from "../services/processRoomChange";
import { tenantConfigs, roomForTenant } from "../tenancy/tenantConfigs";
import { useTenant } from "../tenancy/TenantContext";
import type { TenantConfig, WorkflowDefinition } from "../tenancy/types";
import {
  completeActiveStep,
  createWorkflowInstance,
  type WorkflowInstance,
} from "../workflows/workflowEngine";

interface TenantCustomization {
  featureLabels: Record<string, string>;
  workflow?: WorkflowDefinition;
  primaryColour?: string;
  secondaryColour?: string;
  published: boolean;
  importedRoomRows: number;
}

interface DemoState {
  hasRun: boolean;
  assignmentRoomId: string;
  effectiveAt: string;
  caseState?: RemediationCase;
  roomOverrides: Record<string, RoomFeature[]>;
  workflowInstance?: WorkflowInstance;
  customization: TenantCustomization;
}

interface DemoContextValue extends DemoState {
  tenant: TenantConfig;
  result?: ReturnType<typeof processRoomChange>;
  runDemo: (nextEffectiveAt?: string) => void;
  resetDemo: () => void;
  resetAllDemoData: () => void;
  updateCase: (update: Partial<RemediationCase>) => void;
  updateRoomFeatures: (roomId: string, features: RoomFeature[]) => void;
  completeWorkflowStep: () => void;
  updateCustomization: (update: Partial<TenantCustomization>) => void;
  notifications: NotificationMessage[];
}

const defaultNyuState: DemoState = {
  hasRun: false,
  assignmentRoomId: tenantConfigs.nyu.scenario.originalRoomId,
  effectiveAt: tenantConfigs.nyu.scenario.effectiveAt,
  roomOverrides: {},
  customization: {
    featureLabels: {},
    published: false,
    importedRoomRows: 0,
  },
};

export const initialDemoState = defaultNyuState;

function initialStateFor(tenant: TenantConfig): DemoState {
  return {
    hasRun: false,
    assignmentRoomId: tenant.scenario.originalRoomId,
    effectiveAt: tenant.scenario.effectiveAt,
    roomOverrides: {},
    customization: {
      featureLabels: {},
      published: false,
      importedRoomRows: 0,
    },
  };
}

const DemoContext = createContext<DemoContextValue | null>(null);
const storageKey = (slug: string) => `roomready-demo-v3:${slug}`;

function readState(tenant: TenantConfig): DemoState {
  try {
    const stored = window.localStorage.getItem(storageKey(tenant.slug));
    return stored ? (JSON.parse(stored) as DemoState) : initialStateFor(tenant);
  } catch {
    return initialStateFor(tenant);
  }
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const tenantContext = useTenant();
  const baseTenant = tenantContext.tenant ?? tenantConfigs.nyu;
  const [state, setState] = useState<DemoState>(() => readState(baseTenant));
  const stateMatchesBaseTenant = baseTenant.scenario.rooms.some(
    (room) => room.id === state.assignmentRoomId,
  );

  useEffect(() => {
    setState(readState(baseTenant));
  }, [baseTenant]);

  useEffect(() => {
    if (stateMatchesBaseTenant) {
      window.localStorage.setItem(storageKey(baseTenant.slug), JSON.stringify(state));
    }
  }, [baseTenant.slug, state, stateMatchesBaseTenant]);

  const tenant = useMemo<TenantConfig>(() => {
    const labels = state.customization.featureLabels;
    return {
      ...baseTenant,
      theme: {
        ...baseTenant.theme,
        primaryColour:
          state.customization.primaryColour ?? baseTenant.theme.primaryColour,
        secondaryColour:
          state.customization.secondaryColour ?? baseTenant.theme.secondaryColour,
      },
      featureCatalogue: baseTenant.featureCatalogue.map((feature) => ({
        ...feature,
        displayName: labels[feature.key] ?? feature.displayName,
      })),
      workflow: state.customization.workflow ?? baseTenant.workflow,
    };
  }, [baseTenant, state.customization]);

  const demoRooms = useMemo(
    () =>
      tenant.scenario.rooms.map((room) => ({
        ...room,
        features: state.roomOverrides[room.id] ?? room.features,
      })),
    [state.roomOverrides, tenant.scenario.rooms],
  );
  const stateBelongsToTenant = stateMatchesBaseTenant;

  const result = useMemo(() => {
    if (!state.hasRun || !stateBelongsToTenant) return undefined;
    const scenario = tenant.scenario;
    return processRoomChange({
      student: scenario.student,
      requirements: scenario.requirements,
      course: scenario.course,
      previousRoom:
        demoRooms.find((room) => room.id === scenario.originalRoomId) ??
        roomForTenant(tenant, scenario.originalRoomId),
      newRoom:
        demoRooms.find((room) => room.id === scenario.replacementRoomId) ??
        roomForTenant(tenant, scenario.replacementRoomId),
      candidateRooms: demoRooms.filter((room) => room.id !== scenario.originalRoomId),
      effectiveAt: state.effectiveAt,
      detectedAt: scenario.detectedAt,
      tenant,
    });
  }, [demoRooms, state.effectiveAt, state.hasRun, stateBelongsToTenant, tenant]);

  const runDemo = useCallback(
    (nextEffectiveAt?: string) => {
      setState((current) => {
        const effectiveAt = nextEffectiveAt ?? current.effectiveAt;
        const processed = processRoomChange({
          student: tenant.scenario.student,
          requirements: tenant.scenario.requirements,
          course: tenant.scenario.course,
          previousRoom: roomForTenant(tenant, tenant.scenario.originalRoomId),
          newRoom: roomForTenant(tenant, tenant.scenario.replacementRoomId),
          candidateRooms: tenant.scenario.rooms.filter(
            (room) => room.id !== tenant.scenario.originalRoomId,
          ),
          effectiveAt,
          detectedAt: tenant.scenario.detectedAt,
          tenant,
        });
        return {
          ...current,
          hasRun: true,
          assignmentRoomId: tenant.scenario.replacementRoomId,
          effectiveAt,
          caseState: processed.remediationCase,
          workflowInstance: createWorkflowInstance(
            tenant.workflow,
            `${tenant.slug}-workflow-instance-demo`,
          ),
        };
      });
    },
    [tenant],
  );

  const resetDemo = useCallback(() => {
    window.localStorage.removeItem(storageKey(tenant.slug));
    setState(initialStateFor(tenant));
  }, [tenant]);

  const resetAllDemoData = useCallback(() => {
    Object.values(tenantConfigs).forEach((config) =>
      window.localStorage.removeItem(storageKey(config.slug)),
    );
    setState(initialStateFor(tenant));
  }, [tenant]);

  const updateCase = useCallback(
    (update: Partial<RemediationCase>) => {
      setState((current) => ({
        ...current,
        caseState: {
          id: tenant.scenario.caseId,
          universityId: tenant.id,
          compatibilityCheckId: `check-${tenant.scenario.student.id}`,
          status: "open",
          assignedTeam: tenant.terminology.accessibilityOfficeShort,
          proposedRoomId: tenant.scenario.recommendedRoomId,
          createdAt: tenant.scenario.detectedAt,
          ...current.caseState,
          ...update,
        },
      }));
    },
    [tenant],
  );

  const updateRoomFeatures = useCallback((roomId: string, features: RoomFeature[]) => {
    setState((current) => ({
      ...current,
      roomOverrides: { ...current.roomOverrides, [roomId]: features },
    }));
  }, []);

  const completeWorkflowStep = useCallback(() => {
    setState((current) => ({
      ...current,
      workflowInstance: current.workflowInstance
        ? completeActiveStep(current.workflowInstance)
        : current.workflowInstance,
    }));
  }, []);

  const updateCustomization = useCallback((update: Partial<TenantCustomization>) => {
    setState((current) => ({
      ...current,
      customization: { ...current.customization, ...update },
    }));
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      hasRun: state.hasRun && stateBelongsToTenant,
      assignmentRoomId: stateBelongsToTenant
        ? state.assignmentRoomId
        : tenant.scenario.originalRoomId,
      tenant,
      result,
      runDemo,
      resetDemo,
      resetAllDemoData,
      updateCase,
      updateRoomFeatures,
      completeWorkflowStep,
      updateCustomization,
      notifications: result?.notifications ?? [],
    }),
    [
      completeWorkflowStep,
      resetAllDemoData,
      resetDemo,
      result,
      runDemo,
      state,
      stateBelongsToTenant,
      tenant,
      updateCase,
      updateCustomization,
      updateRoomFeatures,
    ],
  );

  const style = {
    "--tenant-primary": tenant.theme.primaryColour,
    "--tenant-secondary": tenant.theme.secondaryColour,
    "--tenant-accent": tenant.theme.accentColour,
    "--tenant-surface": tenant.theme.surfaceTint,
  } as CSSProperties;

  return (
    <DemoContext.Provider value={value}>
      <div className="tenant-runtime-theme" style={style}>{children}</div>
    </DemoContext.Provider>
  );
}

export function useDemo() {
  const context = useContext(DemoContext);
  if (!context) throw new Error("useDemo must be used inside DemoProvider");
  return context;
}
