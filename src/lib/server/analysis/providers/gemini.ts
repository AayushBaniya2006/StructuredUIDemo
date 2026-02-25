import { buildBlueprintAnalysisPrompt } from '$lib/server/analysis/prompt';
import type { AnalysisProvider, AnalyzePageInput } from '$lib/server/analysis/providers/types';

function parseImageDataUrl(image: string) {
  const match = image.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) {
    throw new Error('Invalid image payload. Expected a base64 data URL.');
  }
  return {
    mimeType: match[1],
    data: match[2],
  };
}

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 2000;

function parseRetryDelay(body: string): number | null {
  const match = body.match(/retry in ([\d.]+)s/i);
  return match ? Math.ceil(parseFloat(match[1]) * 1000) : null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class GeminiAnalysisProvider implements AnalysisProvider {
  readonly name = 'gemini';

  constructor(
    private readonly apiKey: string,
    private readonly model: string
  ) {}

  async analyzePage(input: AnalyzePageInput): Promise<unknown> {
    const { mimeType, data } = parseImageDataUrl(input.image);
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`;

    const body = {
      contents: [
        {
          parts: [
            { text: buildBlueprintAnalysisPrompt(input.pageNumber) },
            { inline_data: { mime_type: mimeType, data } },
          ],
        },
      ],
      generationConfig: {
        response_mime_type: 'application/json',
        temperature: 0.1,
        thinkingConfig: { thinkingBudget: 0 },
      },
    };

    const jsonBody = JSON.stringify(body);

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.apiKey,
        },
        body: jsonBody,
      });

      if (res.status === 429 || res.status === 503) {
        if (attempt === MAX_RETRIES) {
          throw new Error(`Gemini API rate limit after ${MAX_RETRIES + 1} attempts`);
        }
        const errText = await res.text();
        const serverDelay = parseRetryDelay(errText);
        const backoff = serverDelay ?? INITIAL_BACKOFF_MS * 2 ** attempt;
        await sleep(backoff);
        continue;
      }

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Gemini API error (${res.status}): ${errText}`);
      }

      const responseJson = await res.json();
      const text = responseJson.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error('No text in Gemini response');
      }

      try {
        return JSON.parse(text) as unknown;
      } catch {
        throw new Error('Gemini returned malformed JSON');
      }
    }

    throw new Error('Gemini API: exhausted retries');
  }
}
