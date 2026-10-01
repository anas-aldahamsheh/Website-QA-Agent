import { z } from 'zod';

export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.string().default('info'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  STORAGE_ENDPOINT: z.string(),
  STORAGE_PORT: z.string().transform((v: string) => parseInt(v, 10)),
  STORAGE_ACCESS_KEY: z.string(),
  STORAGE_SECRET_KEY: z.string(),
  STORAGE_USE_SSL: z.string().transform((v: string) => v === 'true'),
  STORAGE_BUCKET: z.string(),
  ENCRYPTION_MASTER_KEY: z.string().min(32),
  BETTER_AUTH_SECRET: z.string(),
  BETTER_AUTH_URL: z.string().url(),
  GEMINI_API_KEY: z.string().optional()
});

export type Env = z.infer<typeof EnvSchema>;

export function validateEnv(): Env {
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Environment validation failed:', result.error.format());
    throw new Error('ENV_VALIDATION_ERROR');
  }
  return result.data;
}
