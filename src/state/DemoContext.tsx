/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { processRoomChange } from "../services/processRoomChange";
import {
  course,
  detectedAt,
  effectiveAt,
  maya,
  mayaRequirements,
  roomById,
  rooms,
} from "../data/demoData";
import type {
  NotificationMessage,
  RemediationCase,
  RoomFeature,
} from "../domain/types";

interface DemoState {
  hasRun: boolean;
  assignmentRoomId: string;
  effectiveAt: string;
  caseState?: RemediationCase;
  roomOverrides: Record<string, RoomFeature[]>;
}

interface DemoContextValue extends DemoState {
  result?: ReturnType<typeof processRoomChange>;
  runDemo: (nextEffectiveAt?: string) => void;
  resetDemo: () => void;
  updateCase: (update: Partial<RemediationCase>) => void;
  updateRoomFeatures: (roomId: string, features: RoomFeature[]) => void;
  notifications: NotificationMessage[];
}

export const initialDemoState: DemoState = {
  hasRun: false,
  assignmentRoomId: "room-202",
  effectiveAt,
  roomOverrides: {},
};

const DemoContext = createContext<DemoContextValue | null>(null);
const STORAGE_KEY = "roomready-demo-v1";

function readState(): DemoState {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as DemoState) : initialDemoState;
  } catch {
    return initialDemoState;
  }
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(readState);
  const demoRooms = useMemo(
    () =>
      rooms.map((room) => ({
        ...room,
        features: state.roomOverrides[room.id] ?? room.features,
      })),
    [state.roomOverrides],
  );
  const result = useMemo(() => {
    if (!state.hasRun) return undefined;
    return processRoomChange({
      student: maya,
      requirements: mayaRequirements,
      course,
      previousRoom: demoRooms.find((room) => room.id === "room-202") ?? roomById("room-202"),
      newRoom: demoRooms.find((room) => room.id === "room-815") ?? roomById("room-815"),
      candidateRooms: demoRooms.filter((room) => room.id !== "room-202"),
      effectiveAt: state.effectiveAt,
      detectedAt,
    });
  }, [demoRooms, state.effectiveAt, state.hasRun]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const runDemo = useCallback((nextEffectiveAt?: string) => {
    setState((current) => {
      const changed = {
        ...current,
        hasRun: true,
        assignmentRoomId: "room-815",
        effectiveAt: nextEffectiveAt ?? current.effectiveAt,
      };
      const processed = processRoomChange({
        student: maya,
        requirements: mayaRequirements,
        course,
        previousRoom: roomById("room-202"),
        newRoom: roomById("room-815"),
        candidateRooms: rooms.filter((room) => room.id !== "room-202"),
        effectiveAt: changed.effectiveAt,
        detectedAt,
      });
      return { ...changed, caseState: processed.remediationCase };
    });
  }, []);

  const resetDemo = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setState(initialDemoState);
  }, []);

  const updateCase = useCallback((update: Partial<RemediationCase>) => {
    setState((current) => ({
      ...current,
      caseState: {
        id: "RR-1042",
        compatibilityCheckId: "check-maya-815",
        status: "open",
        assignedTeam: "Accessibility Operations",
        proposedRoomId: "room-812",
        createdAt: detectedAt,
        ...current.caseState,
        ...update,
      },
    }));
  }, []);

  const updateRoomFeatures = useCallback((roomId: string, features: RoomFeature[]) => {
    setState((current) => ({
      ...current,
      roomOverrides: { ...current.roomOverrides, [roomId]: features },
    }));
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      result,
      runDemo,
      resetDemo,
      updateCase,
      updateRoomFeatures,
      notifications: result?.notifications ?? [],
    }),
    [resetDemo, result, runDemo, state, updateCase, updateRoomFeatures],
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const context = useContext(DemoContext);
  if (!context) throw new Error("useDemo must be used inside DemoProvider");
  return context;
}
