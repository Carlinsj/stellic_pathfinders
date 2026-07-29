import type {
  CompatibilityResult,
  RemediationCase,
  RoomChangeEvent,
} from "../domain/types";

export interface RoomReadyRepository {
  saveRoomChange(event: RoomChangeEvent): Promise<void>;
  saveCompatibilityCheck(result: CompatibilityResult): Promise<string>;
  saveRemediationCase(caseRecord: RemediationCase): Promise<void>;
}

export class LocalDemoRepository implements RoomReadyRepository {
  async saveRoomChange(event: RoomChangeEvent) {
    window.localStorage.setItem(`roomready:event:${event.id}`, JSON.stringify(event));
  }

  async saveCompatibilityCheck(result: CompatibilityResult) {
    const id = `local-check-${result.evaluatedAt}`;
    window.localStorage.setItem(`roomready:check:${id}`, JSON.stringify(result));
    return id;
  }

  async saveRemediationCase(caseRecord: RemediationCase) {
    window.localStorage.setItem(
      `roomready:case:${caseRecord.id}`,
      JSON.stringify(caseRecord),
    );
  }
}
