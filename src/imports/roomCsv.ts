import { z } from "zod";

export const roomCsvSchema = z.object({
  building_name: z.string().min(1),
  building_code: z.string().min(1),
  room_number: z.string().min(1),
  capacity: z.coerce.number().int().positive(),
  floor: z.coerce.number().int(),
  room_type: z.string().min(1),
  feature_key: z.string().min(1),
  feature_availability: z.enum([
    "available",
    "unavailable",
    "unknown",
    "temporarily_unavailable",
  ]),
  verification_date: z.string().date(),
  verification_source: z.string().min(1),
});

export type RoomCsvRow = z.infer<typeof roomCsvSchema>;

export interface RoomCsvError {
  row: number;
  message: string;
}

export const roomCsvHeaders = Object.keys(roomCsvSchema.shape);

export const roomCsvTemplate = `${roomCsvHeaders.join(",")}
Demo Hall,DH,DH 101,40,1,Flexible classroom,height_adjustable_student_desk,available,2026-07-18,Facilities walkthrough`;

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      values.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }
  values.push(current.trim());
  return values;
}

export function parseRoomCsv(csv: string) {
  const lines = csv.trim().split(/\r?\n/).filter(Boolean);
  if (!lines.length) return { validRows: [], errors: [{ row: 1, message: "CSV is empty." }] };
  const headers = parseCsvLine(lines[0]!);
  const missing = roomCsvHeaders.filter((header) => !headers.includes(header));
  if (missing.length) {
    return {
      validRows: [],
      errors: [{ row: 1, message: `Missing columns: ${missing.join(", ")}` }],
    };
  }

  const validRows: RoomCsvRow[] = [];
  const errors: RoomCsvError[] = [];
  lines.slice(1).forEach((line, index) => {
    const values = parseCsvLine(line);
    const record = Object.fromEntries(headers.map((header, column) => [header, values[column] ?? ""]));
    const parsed = roomCsvSchema.safeParse(record);
    if (parsed.success) {
      validRows.push(parsed.data);
    } else {
      errors.push({
        row: index + 2,
        message: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; "),
      });
    }
  });
  return { validRows, errors };
}
