import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const repositoryEnvironment = fileURLToPath(new URL('../../../.env', import.meta.url));
config({ path: repositoryEnvironment });
config({ path: '.env', override: true });

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),

  SUPABASE_URL: z.string().url(),

  SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .min(1, 'SUPABASE_PUBLISHABLE_KEY is required'),

  SUPABASE_SECRET_KEY: z
    .string()
    .min(1, 'SUPABASE_SECRET_KEY is required'),

  DEMO_JWT_SECRET: z.string().min(32),

  INTERNAL_JOB_SECRET: z.string().min(32),

  DEMO_ENABLED: z.enum(['true', 'false']).default('true').transform((value) => value === 'true'),
});

export const env = envSchema.parse(process.env);
