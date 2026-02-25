import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the env module
vi.mock('$env/dynamic/private', () => ({
  env: { GEMINI_API_KEY: 'test-key', GEMINI_MODEL: 'gemini-2.5-flash' },
}));

const mockGeminiResponse = (sheetType: string, issues: object[] = []) => ({
  candidates: [{
    content: {
      parts: [{
        text: JSON.stringify({
          sheetType,
          criteria: [
            { id: 'EQ-1', criterionKey: 'EQ', name: 'Equipment Labels', result: 'fail', summary: 'Missing labels', confidence: 85 },
            { id: 'DIM-1', criterionKey: 'DIM', name: 'Dimensions', result: 'pass', summary: 'Dimensions present', confidence: 90 },
          ],
          issues,
        }),
      }],
    },
  }],
});

describe('POST /api/analyze', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('returns 400 when pages array is empty', async () => {
    const { POST } = await import('./+server');
    const request = new Request('http://localhost/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pages: [] }),
    });
    await expect(POST({ request } as Parameters<typeof POST>[0])).rejects.toMatchObject({ status: 400 });
  });

  it('returns 400 when pages exceed MAX_PAGES', async () => {
    const { POST } = await import('./+server');
    const pages = Array.from({ length: 25 }, (_, i) => ({ pageNumber: i + 1, image: 'data:image/png;base64,abc' }));
    const request = new Request('http://localhost/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pages }),
    });
    await expect(POST({ request } as Parameters<typeof POST>[0])).rejects.toMatchObject({ status: 400 });
  });

  it('parses Gemini response and returns issues with sheetType', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockGeminiResponse('electrical', [{
        title: 'Missing circuit label',
        description: 'Panel circuit not identified',
        severity: 'high',
        category: 'missing-label',
        criterionKey: 'EQ',
        box_2d: [100, 200, 300, 400],
        confidence: 90,
      }]),
    } as Response));

    const { POST } = await import('./+server');
    const request = new Request('http://localhost/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pages: [{ pageNumber: 1, image: 'data:image/png;base64,abc' }] }),
    });

    const response = await POST({ request } as Parameters<typeof POST>[0]);
    const data = await response.json();

    expect(data.issues).toHaveLength(1);
    expect(data.issues[0].sheetType).toBe('electrical');
    expect(data.issues[0].severity).toBe('high');
    expect(data.criteria[0].sheetType).toBe('electrical');
    expect(data.metadata.requestId).toBeDefined();
    expect(data.pageResults[0].status).toBe('ok');
  });

  it('continues analysis when one page fails (Promise.allSettled)', async () => {
    let callCount = 0;
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount === 1) throw new Error('Network error');
      return {
        ok: true,
        json: async () => mockGeminiResponse('architectural'),
      } as Response;
    }));

    const { POST } = await import('./+server');
    const request = new Request('http://localhost/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pages: [
          { pageNumber: 1, image: 'data:image/png;base64,abc' },
          { pageNumber: 2, image: 'data:image/png;base64,def' },
        ],
      }),
    });

    const response = await POST({ request } as Parameters<typeof POST>[0]);
    const data = await response.json();
    expect(data.metadata.failedPages).toBe(1);
    expect(data.metadata.analyzedPages).toBe(1);
    expect(data.pageResults).toHaveLength(2);
    expect(data.pageResults[0].status).toBe('error');
    expect(data.pageResults[1].status).toBe('ok');
  });

  it('treats malformed AI bbox as page-level failure and preserves partial results', async () => {
    let callCount = 0;
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return {
          ok: true,
          json: async () => mockGeminiResponse('electrical', [{
            title: 'Bad box',
            description: 'Malformed bbox',
            severity: 'high',
            category: 'missing-label',
            criterionKey: 'EQ',
            box_2d: [200, 200, 100, 100],
            confidence: 90,
          }]),
        } as Response;
      }
      return {
        ok: true,
        json: async () => mockGeminiResponse('architectural'),
      } as Response;
    }));

    const { POST } = await import('./+server');
    const request = new Request('http://localhost/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pages: [
          { pageNumber: 1, image: 'data:image/png;base64,abc' },
          { pageNumber: 2, image: 'data:image/png;base64,def' },
        ],
      }),
    });

    const response = await POST({ request } as Parameters<typeof POST>[0]);
    const data = await response.json();

    expect(data.metadata.failedPages).toBe(1);
    expect(data.pageResults[0].status).toBe('error');
    expect(data.criteria.some((c: { id: string }) => c.id === 'ERR-1')).toBe(true);
  });

  it('returns 400 when all pages fail validation', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{
          content: {
            parts: [{ text: '{"sheetType":"electrical","criteria":[],"issues":[{"oops":true}]}' }],
          },
        }],
      }),
    } as Response));

    const { POST } = await import('./+server');
    const request = new Request('http://localhost/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pages: [{ pageNumber: 1, image: 'data:image/png;base64,abc' }] }),
    });

    await expect(POST({ request } as Parameters<typeof POST>[0])).rejects.toMatchObject({ status: 400 });
  });
});
