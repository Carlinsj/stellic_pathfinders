import type {
  WorkflowDefinition,
  WorkflowStepStatus,
} from "../tenancy/types";

export interface WorkflowStepInstance {
  stepId: string;
  label: string;
  status: WorkflowStepStatus;
}

export interface WorkflowInstance {
  id: string;
  universityId: string;
  definitionId: string;
  definitionVersion: number;
  definitionSnapshot: WorkflowDefinition;
  steps: WorkflowStepInstance[];
}

function cloneDefinition(definition: WorkflowDefinition): WorkflowDefinition {
  return JSON.parse(JSON.stringify(definition)) as WorkflowDefinition;
}

export function createWorkflowInstance(
  definition: WorkflowDefinition,
  instanceId: string,
): WorkflowInstance {
  const snapshot = cloneDefinition(definition);
  return {
    id: instanceId,
    universityId: definition.universityId,
    definitionId: definition.id,
    definitionVersion: definition.version,
    definitionSnapshot: snapshot,
    steps: snapshot.steps.map((step, index) => ({
      stepId: step.id,
      label: step.label,
      status: index === 0 ? "active" : "pending",
    })),
  };
}

export function completeActiveStep(instance: WorkflowInstance): WorkflowInstance {
  const activeIndex = instance.steps.findIndex((step) => step.status === "active");
  if (activeIndex < 0) return instance;
  return {
    ...instance,
    steps: instance.steps.map((step, index) => {
      if (index === activeIndex) return { ...step, status: "completed" };
      if (index === activeIndex + 1 && step.status === "pending") {
        return { ...step, status: "active" };
      }
      return step;
    }),
  };
}

export function reorderWorkflowStep(
  definition: WorkflowDefinition,
  stepId: string,
  direction: "up" | "down",
): WorkflowDefinition {
  const steps = [...definition.steps];
  const index = steps.findIndex((step) => step.id === stepId);
  const nextIndex = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || nextIndex < 0 || nextIndex >= steps.length) return definition;
  [steps[index], steps[nextIndex]] = [steps[nextIndex]!, steps[index]!];
  return { ...definition, version: definition.version + 1, steps };
}
