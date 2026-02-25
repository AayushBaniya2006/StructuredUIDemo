import { expect, test, type Page } from '@playwright/test';
import path from 'node:path';

function samplePdfPath() {
  return path.resolve('e2e/fixtures/test-blueprint.pdf');
}

async function mockAnalyzeSuccess(page: Page) {
  await page.route('**/api/analyze', async (route) => {
    const body = route.request().postDataJSON() as {
      pages?: Array<{ pageNumber: number }>;
    };
    const pageNumber = body.pages?.[0]?.pageNumber ?? 1;

    const payload = {
      criteria: [
        {
          id: `EQ-${pageNumber}`,
          name: 'Equipment/Element Labels',
          description: 'All major equipment, rooms, and elements are labeled',
          result: pageNumber % 2 === 0 ? 'pass' : 'fail',
          summary:
            pageNumber % 2 === 0
              ? `Page ${pageNumber} labels appear complete`
              : `Page ${pageNumber} has a missing equipment label`,
          page: pageNumber,
          confidence: 88,
          sheetType: pageNumber % 2 === 0 ? 'architectural' : 'electrical',
        },
      ],
      issues:
        pageNumber % 2 === 0
          ? []
          : [
              {
                id: `TMP-${pageNumber}`,
                page: pageNumber,
                title: 'Missing label',
                description: `Mocked issue on page ${pageNumber}`,
                severity: 'medium',
                status: 'open',
                category: 'missing-label',
                bbox: { x: 0.2, y: 0.2, width: 0.15, height: 0.1 },
                criterionId: `EQ-${pageNumber}`,
                confidence: 86,
                sheetType: 'electrical',
              },
            ],
      metadata: {
        requestId: `e2e-${pageNumber}`,
        totalPages: 1,
        analyzedPages: 1,
        failedPages: 0,
        emptyIssues: pageNumber % 2 === 0,
        timings: { totalMs: 10, avgPageMs: 10 },
      },
      pageResults: [
        {
          pageNumber,
          status: 'ok',
          issueCount: pageNumber % 2 === 0 ? 0 : 1,
          criterionCount: 1,
          durationMs: 10,
        },
      ],
    };

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(payload),
    });
  });
}

async function mockAnalyzeError(page: Page) {
  await page.route('**/api/analyze', async (route) => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Mock analysis provider failed' }),
    });
  });
}

async function uploadFromWelcome(page: Page) {
  await page.getByTestId('welcome-upload-input').setInputFiles(samplePdfPath());
}

test('welcome screen loads before upload', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByTestId('welcome-upload')).toBeVisible();
  await expect(page.getByTestId('app-toolbar')).toHaveCount(0);
  await expect(page.getByTestId('document-viewer')).toHaveCount(0);
});

test('upload with mocked analysis shows viewer and core panels', async ({ page }) => {
  await mockAnalyzeSuccess(page);
  await page.goto('/');

  await uploadFromWelcome(page);

  await expect(page.getByTestId('app-toolbar')).toBeVisible();
  await expect(page.getByTestId('issues-panel')).toBeVisible();
  await expect(page.getByTestId('document-viewer')).toBeVisible();
  await expect(page.getByTestId('page-counter')).toContainText('Page 1 of 2');
  await expect(page.getByTestId('criteria-panel')).toContainText('QA Criteria');
});

test('keyboard workflows work after upload', async ({ page }) => {
  await mockAnalyzeSuccess(page);
  await page.goto('/');

  await uploadFromWelcome(page);
  await expect(page.getByTestId('page-counter')).toContainText('Page 1 of 2');

  await page.keyboard.press('n');
  await expect(page.getByTestId('page-counter')).toContainText('Page 2');

  await page.keyboard.press('p');
  await expect(page.getByTestId('page-counter')).toContainText('Page 1');

  await page.keyboard.press('+');
  await expect(page.getByTestId('app-toolbar')).toBeVisible();

  await page.keyboard.press('?');
  await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toHaveCount(0);
});

test('upload workflow handles invalid file and mocked analysis error', async ({ page }) => {
  await mockAnalyzeError(page);
  await page.goto('/');

  const welcomeInput = page.getByTestId('welcome-upload-input');
  await welcomeInput.setInputFiles({
    name: 'bad.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('not a pdf'),
  });
  await expect(page.getByText('Only PDF files are supported.')).toBeVisible();

  await welcomeInput.setInputFiles(samplePdfPath());
  await expect(page.getByTestId('analysis-error')).toBeVisible();
});
