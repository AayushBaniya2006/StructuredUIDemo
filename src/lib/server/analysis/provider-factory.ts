import type { AnalysisProvider } from '$lib/server/analysis/providers/types';
import { GeminiAnalysisProvider } from '$lib/server/analysis/providers/gemini';
import { MockAnalysisProvider } from '$lib/server/analysis/providers/mock';
import type { ServerEnv } from '$lib/server/env';

export function createAnalysisProvider(config: ServerEnv): AnalysisProvider {
  const explicitProvider = config.ANALYSIS_PROVIDER;
  const useMock = explicitProvider === 'mock' || config.MOCK_ANALYSIS === 'true';

  if (useMock) {
    return new MockAnalysisProvider();
  }

  if (!config.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured. Set it in your .env file.');
  }

  return new GeminiAnalysisProvider(config.GEMINI_API_KEY, config.GEMINI_MODEL);
}
