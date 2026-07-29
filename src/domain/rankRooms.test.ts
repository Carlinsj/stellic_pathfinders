import { describe, expect, it } from "vitest";
import { course, mayaRequirements, roomById, rooms } from "../data/demoData";
import { rankAlternativeRooms } from "./rankRooms";

describe("rankAlternativeRooms", () => {
  it("ranks Room 812 as the primary demo recommendation", () => {
    const ranking = rankAlternativeRooms({
      rooms: rooms.filter((room) => room.id !== "room-202"),
      requirements: mayaRequirements,
      course,
      currentRoom: roomById("room-202"),
      evaluatedAt: "2026-07-29T15:14:00.000Z",
    });
    expect(ranking[0]?.room.id).toBe("room-812");
    expect(ranking[0]?.eligible).toBe(true);
  });

  it("never recommends an incompatible nearby room", () => {
    const ranking = rankAlternativeRooms({
      rooms: [roomById("room-815"), roomById("room-606")],
      requirements: mayaRequirements,
      course,
      currentRoom: roomById("room-202"),
      evaluatedAt: "2026-07-29T15:14:00.000Z",
    });
    expect(ranking[0]?.room.id).toBe("room-606");
    expect(ranking.find((item) => item.room.id === "room-815")?.score).toBe(0);
  });

  it("excludes a room that does not fit the course", () => {
    const undersized = { ...roomById("room-812"), id: "small-room", capacity: 20 };
    const ranking = rankAlternativeRooms({
      rooms: [undersized],
      requirements: mayaRequirements,
      course,
      currentRoom: roomById("room-202"),
      evaluatedAt: "2026-07-29T15:14:00.000Z",
    });
    expect(ranking[0]?.breakdown.capacity).toBe(0);
  });
});
