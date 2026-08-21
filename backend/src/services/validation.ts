import { z } from 'zod';

// PostgreSQL accepts UUID-shaped values without requiring RFC version bits.
// The deterministic CampusFit seed intentionally uses md5(text)::uuid, so a
// strict RFC UUID validator would reject valid primary keys from our database.
export const databaseIdSchema = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  'Invalid database identifier',
);
