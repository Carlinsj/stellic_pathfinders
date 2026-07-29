import { z } from "zod";

export const roomChangeInputSchema = z.object({
  sectionId: z.string().min(1),
  previousRoomId: z.string().min(1),
  newRoomId: z.string().min(1),
  effectiveAt: z.string().datetime(),
  reason: z.string().min(3).max(240),
});

export type RoomChangeInput = z.infer<typeof roomChangeInputSchema>;
