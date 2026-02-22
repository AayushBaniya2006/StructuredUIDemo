/**
 * Generate a minimal 2-page test PDF for E2E tests
 * Run: npx tsx e2e/fixtures/generate-fixture.ts
 */
import { jsPDF } from 'jspdf';
import { writeFileSync } from 'fs';

const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a3' });
const W = doc.internal.pageSize.getWidth();
const H = doc.internal.pageSize.getHeight();

// Page 1: Test Blueprint
doc.setDrawColor(100, 100, 120);
doc.setLineWidth(1);
doc.rect(50, 40, W - 100, H - 80);

doc.setFontSize(14);
doc.setTextColor(60, 60, 80);
doc.text('TEST BLUEPRINT PAGE 1', W / 2, 80, { align: 'center' });

doc.setFontSize(10);
doc.text('E2E Test Document - Page 1 of 2', W / 2, 100, { align: 'center' });

// Draw some rectangles representing rooms
doc.setDrawColor(80, 80, 100);
doc.setLineWidth(1.5);
doc.rect(100, 150, 200, 180);
doc.text('ROOM A', 200, 240, { align: 'center' });

doc.rect(350, 150, 200, 180);
doc.text('ROOM B', 450, 240, { align: 'center' });

doc.rect(600, 150, 150, 180);
doc.text('ROOM C', 675, 240, { align: 'center' });

// Page 2
doc.addPage();
doc.setDrawColor(100, 100, 120);
doc.setLineWidth(1);
doc.rect(50, 40, W - 100, H - 80);

doc.setFontSize(14);
doc.setTextColor(60, 60, 80);
doc.text('TEST BLUEPRINT PAGE 2', W / 2, 80, { align: 'center' });

doc.setFontSize(10);
doc.text('E2E Test Document - Page 2 of 2', W / 2, 100, { align: 'center' });

doc.rect(100, 150, 250, 200);
doc.text('ROOM D', 225, 250, { align: 'center' });

doc.rect(400, 150, 250, 200);
doc.text('ROOM E', 525, 250, { align: 'center' });

const pdfOutput = doc.output('arraybuffer');
writeFileSync('e2e/fixtures/test-blueprint.pdf', Buffer.from(pdfOutput));
console.log('Generated e2e/fixtures/test-blueprint.pdf (2 pages)');
