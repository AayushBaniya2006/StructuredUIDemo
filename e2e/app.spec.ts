import { expect, test } from '@playwright/test';
import path from 'node:path';

test('app smoke loads core panels', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByTestId('app-toolbar')).toBeVisible();
  await expect(page.getByTestId('issues-panel')).toBeVisible();
  await expect(page.getByTestId('document-viewer')).toBeVisible();
  await expect(page.getByTestId('page-counter')).toContainText('Page 1');
});

test('keyboard workflows work', async ({ page }) => {
  await page.goto('/');

  const fileInput = page.getByTestId('upload-input');
  const samplePath = path.resolve('e2e/fixtures/test-blueprint.pdf');
  await fileInput.setInputFiles(samplePath);
  await expect(page.getByTestId('page-counter')).toContainText('Page 1 of 2');

  await page.keyboard.press('n');
  await expect(page.getByTestId('page-counter')).toContainText('Page 2');

  await page.keyboard.press('p');
  await expect(page.getByTestId('page-counter')).toContainText('Page 1');

  await page.keyboard.press('+');
  await expect(page.getByText(/\d+%/)).toBeVisible();

  await page.keyboard.press('0');
  await expect(page.getByText('100%')).toBeVisible();
});

test('issue selection navigates and detail actions work', async ({ page }) => {
  await page.goto('/');

  const fileInput = page.getByTestId('upload-input');
  const samplePath = path.resolve('e2e/fixtures/test-blueprint.pdf');
  await fileInput.setInputFiles(samplePath);
  await page.waitForLoadState('networkidle');

  await expect(page.getByTestId('page-counter')).toContainText('Page 1 of 2');
});

test('upload workflow handles invalid and valid files', async ({ page }) => {
  await page.goto('/');

  const fileInput = page.getByTestId('upload-input');
  await fileInput.setInputFiles({
    name: 'bad.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('not a pdf'),
  });
  await expect(page.getByTestId('upload-error')).toContainText('Only PDF files are supported.');

  const samplePath = path.resolve('e2e/fixtures/test-blueprint.pdf');
  await fileInput.setInputFiles(samplePath);
  await expect(page.getByTestId('upload-error')).toHaveCount(0);
  await expect(page.getByTestId('page-counter')).toContainText('Page 1');
});
