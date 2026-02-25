import { env } from '$env/dynamic/private';
import { z } from 'zod';

const serverEnvSchema = z.object({
  GEMINI_API_KEY: z.string().trim().min(1).optional(),
  GEMINI_MODEL: z.string().trim().min(1).default('gemini-3-flash-preview'),
  ANALYSIS_PROVIDER: z.enum(['gemini', 'mock']).optional(),
  MOCK_ANALYSIS: z.enum(['true', 'false']).optional(),
  ANALYSIS_LOG_LEVEL: z.enum(['debug', 'info']).optional().default('info'),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedEnv: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (!cachedEnv) {
    cachedEnv = serverEnvSchema.parse(env);
  }
  return cachedEnv;
}

export function resetServerEnvCacheForTests() {
  cachedEnv = null;
}
