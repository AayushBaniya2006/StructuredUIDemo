import { describe, expect, it } from 'vitest';
import { generateReportHTML } from './generate-report';
import type { Issue, QACriterion } from '$lib/types';

describe('generateReportHTML', () => {
  it('escapes untrusted issue and criterion content', () => {
    const issues: Issue[] = [
      {
        id: 'ISS-001',
        page: 1,
        title: '<script>alert("x")</script>',
        description: 'desc',
        severity: 'high',
        status: 'open',
        category: 'missing-label',
        bbox: { x: 0, y: 0, width: 0.1, height: 0.1 },
      },
    ];
    const criteria: QACriterion[] = [
      {
        id: 'EQ-1',
        name: 'Equipment "Labels"',
        description: 'desc',
        result: 'fail',
        summary: "Missing <b>tag</b> & 'quotes'",
        page: 1,
      },
    ];

    const html = generateReportHTML({
      issues,
      criteria,
      generatedAt: '2026-02-25T00:00:00.000Z',
    });

    expect(html).not.toContain('<script>alert("x")</script>');
    expect(html).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
    expect(html).toContain('Equipment &quot;Labels&quot;');
    expect(html).toContain('Missing &lt;b&gt;tag&lt;/b&gt; &amp; &#39;quotes&#39;');
  });
});
