/**
 * Generate a mock multi-page architectural blueprint PDF.
 * Run: npx tsx scripts/generate-blueprint.ts
 */
import { jsPDF } from 'jspdf';
import { writeFileSync } from 'fs';

const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a3' });
const W = doc.internal.pageSize.getWidth();
const H = doc.internal.pageSize.getHeight();

function drawGrid(doc: jsPDF) {
  doc.setDrawColor(200, 200, 220);
  doc.setLineWidth(0.3);
  const cols = ['A', 'B', 'C', 'D', 'E', 'F'];
  const colSpacing = (W - 120) / (cols.length - 1);
  cols.forEach((label, i) => {
    const x = 60 + i * colSpacing;
    doc.line(x, 40, x, H - 40);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 170);
    doc.text(label, x - 3, 35);
  });
  const rows = ['1', '2', '3', '4', '5'];
  const rowSpacing = (H - 100) / (rows.length - 1);
  rows.forEach((label, i) => {
    const y = 50 + i * rowSpacing;
    doc.line(60, y, W - 60, y);
    doc.text(label, 48, y + 3);
  });
}

function drawTitleBlock(doc: jsPDF, title: string, sheetNum: number) {
  doc.setDrawColor(50, 50, 50);
  doc.setLineWidth(1.5);
  doc.rect(30, 20, W - 60, H - 40);
  const tbW = 280;
  const tbH = 60;
  const tbX = W - 30 - tbW;
  const tbY = H - 20 - tbH;
  doc.setLineWidth(0.8);
  doc.rect(tbX, tbY, tbW, tbH);
  doc.setFontSize(10);
  doc.setTextColor(50, 50, 50);
  doc.text('ACME Construction Corp.', tbX + 10, tbY + 15);
  doc.setFontSize(8);
  doc.text('Sheet ' + sheetNum + ' of 4', tbX + 10, tbY + 28);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(title, tbX + 10, tbY + 48);
  doc.setFont('helvetica', 'normal');
}

function drawRoom(doc: jsPDF, x: number, y: number, w: number, h: number, label: string) {
  doc.setDrawColor(60, 60, 80);
  doc.setLineWidth(1);
  doc.rect(x, y, w, h);
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 80);
  const lines = label.split('\n');
  const lineHeight = 12;
  const startY = y + h / 2 - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((line, i) => {
    doc.text(line, x + w / 2, startY + i * lineHeight, { align: 'center' });
  });
}

function drawDoor(doc: jsPDF, x: number, y: number, vertical: boolean) {
  doc.setDrawColor(60, 60, 80);
  doc.setLineWidth(0.8);
  const size = 24;
  if (vertical) {
    doc.line(x, y, x, y + size);
    doc.setDrawColor(150, 150, 170);
    doc.setLineDashPattern([2, 2], 0);
    doc.line(x, y, x + size * 0.7, y + size * 0.5);
    doc.setLineDashPattern([], 0);
  } else {
    doc.line(x, y, x + size, y);
    doc.setDrawColor(150, 150, 170);
    doc.setLineDashPattern([2, 2], 0);
    doc.line(x, y, x + size * 0.5, y + size * 0.7);
    doc.setLineDashPattern([], 0);
  }
}

function drawWindow(doc: jsPDF, x: number, y: number, length: number, vertical: boolean) {
  doc.setDrawColor(100, 140, 200);
  doc.setLineWidth(1.5);
  if (vertical) {
    doc.line(x, y, x, y + length);
    doc.line(x - 3, y, x - 3, y + length);
  } else {
    doc.line(x, y, x + length, y);
    doc.line(x, y - 3, x + length, y - 3);
  }
}

// === PAGE 1: Ground Floor Plan ===
drawGrid(doc);
drawTitleBlock(doc, 'GROUND FLOOR PLAN - A1.01', 1);

drawRoom(doc, 100, 80, 250, 180, 'LOBBY\n101');
drawRoom(doc, 100, 260, 120, 150, 'STORAGE\n102');
drawRoom(doc, 220, 260, 130, 150, 'OFFICE\n103');
drawRoom(doc, 380, 80, 200, 180, 'CONFERENCE\n104');
drawRoom(doc, 380, 260, 200, 150, 'BREAK ROOM\n105');
drawRoom(doc, 610, 80, 180, 330, 'OPEN OFFICE\n106');
drawRoom(doc, 820, 80, 120, 160, 'STAIRWELL\nS-1');
drawRoom(doc, 820, 240, 120, 170, 'RESTROOM\n107');

drawDoor(doc, 340, 160, true);
drawDoor(doc, 200, 260, false);
drawDoor(doc, 330, 330, true);
drawDoor(doc, 575, 200, true);

drawWindow(doc, 100, 80, 80, false);
drawWindow(doc, 790, 80, 80, true);
drawWindow(doc, 610, 410, 100, false);

doc.setDrawColor(80, 80, 100);
doc.setLineWidth(0.3);
doc.line(100, 440, 350, 440);
doc.setFontSize(7);
doc.setTextColor(80, 80, 100);
doc.text("25'-0\"", 200, 435);

// === PAGE 2: First Floor Plan ===
doc.addPage();
drawGrid(doc);
drawTitleBlock(doc, 'FIRST FLOOR PLAN - A1.02', 2);

drawRoom(doc, 100, 80, 200, 200, 'OFFICE\n201');
drawRoom(doc, 300, 80, 140, 200, 'CORRIDOR');
drawRoom(doc, 440, 80, 180, 200, 'OFFICE\n202');
drawRoom(doc, 100, 280, 200, 130, 'MEETING\n203');
drawRoom(doc, 440, 280, 180, 130, 'BATHROOM\n204');
drawRoom(doc, 650, 80, 200, 330, 'OPEN OFFICE\n205');
drawRoom(doc, 880, 80, 100, 160, 'STAIRWELL\nS-1');
drawRoom(doc, 880, 240, 100, 170, 'STORAGE\n206');

drawDoor(doc, 295, 170, true);
drawDoor(doc, 430, 170, true);
drawDoor(doc, 200, 280, false);
drawDoor(doc, 530, 280, false);

drawWindow(doc, 100, 80, 60, false);
drawWindow(doc, 440, 80, 60, false);

// === PAGE 3: MEP ===
doc.addPage();
drawGrid(doc);
drawTitleBlock(doc, 'MEP OVERLAY - M1.01', 3);

doc.setDrawColor(220, 100, 100);
doc.setFillColor(255, 230, 230);
doc.setLineWidth(1);
doc.rect(80, 160, 700, 30, 'FD');
doc.setFontSize(7);
doc.setTextColor(180, 60, 60);
doc.text('24" SUPPLY DUCT', 350, 180);

doc.rect(200, 190, 20, 100, 'FD');
doc.rect(450, 190, 20, 100, 'FD');
doc.rect(650, 190, 20, 100, 'FD');

doc.setDrawColor(100, 100, 220);
doc.setFillColor(230, 230, 255);
doc.rect(80, 350, 500, 25, 'FD');
doc.setTextColor(60, 60, 180);
doc.text('18x12 RETURN AIR DUCT', 250, 367);

doc.setDrawColor(60, 180, 60);
doc.setLineWidth(2);
doc.setLineDashPattern([8, 4], 0);
doc.line(100, 250, 800, 250);
doc.setFontSize(6);
doc.setTextColor(40, 140, 40);
doc.text('4" WASTE PIPE', 400, 245);
doc.setLineDashPattern([], 0);

doc.setDrawColor(200, 150, 50);
doc.setLineWidth(1);
doc.setLineDashPattern([3, 3], 0);
doc.line(120, 260, 780, 260);
doc.setTextColor(180, 130, 30);
doc.text('2" ELEC CONDUIT', 400, 275);
doc.setLineDashPattern([], 0);

doc.setDrawColor(200, 50, 50);
doc.setFillColor(255, 100, 100);
[150, 300, 450, 600, 750].forEach((x) => {
  doc.circle(x, 130, 4, 'FD');
  doc.setFontSize(5);
  doc.text('SH', x - 4, 125);
});

doc.setFillColor(255, 0, 0);
const fdX = 390;
doc.triangle(fdX, 155, fdX - 6, 168, fdX + 6, 168, 'FD');
doc.setFontSize(5);
doc.setTextColor(200, 0, 0);
doc.text('FD', fdX - 4, 150);

doc.setDrawColor(100, 100, 100);
doc.setLineWidth(2);
doc.setFillColor(220, 220, 220);
doc.rect(250, 140, 12, 80, 'FD');
doc.setFontSize(5);
doc.setTextColor(80, 80, 80);
doc.text('W12x26', 230, 138);

// === PAGE 4: Structural ===
doc.addPage();
drawGrid(doc);
drawTitleBlock(doc, 'STRUCTURAL PLAN - S1.01', 4);

doc.setDrawColor(80, 80, 80);
doc.setFillColor(180, 180, 180);
const colPositions: [number, number][] = [
  [120, 100], [320, 100], [520, 100], [720, 100],
  [120, 260], [320, 260], [520, 260], [720, 260],
  [120, 420], [320, 420], [520, 420], [720, 420],
];
colPositions.forEach(([cx, cy], i) => {
  doc.rect(cx - 8, cy - 8, 16, 16, 'FD');
  doc.setFontSize(6);
  doc.setTextColor(80, 80, 80);
  doc.text('C-' + (i + 1), cx - 6, cy - 12);
});

doc.setLineWidth(3);
doc.setDrawColor(120, 120, 120);
for (let row = 0; row < 3; row++) {
  const y = 100 + row * 160;
  for (let col = 0; col < 3; col++) {
    const x1 = 120 + col * 200;
    doc.line(x1, y, x1 + 200, y);
  }
}
for (let col = 0; col < 4; col++) {
  const x = 120 + col * 200;
  for (let row = 0; row < 2; row++) {
    const y1 = 100 + row * 160;
    doc.line(x, y1, x, y1 + 160);
  }
}

doc.setDrawColor(140, 100, 60);
doc.setLineWidth(1);
doc.setLineDashPattern([4, 4], 0);
colPositions.forEach(([cx, cy], i) => {
  const fw = i === 8 ? 36 : 48;
  doc.rect(cx - fw / 2, cy - fw / 2, fw, fw);
  doc.setFontSize(5);
  doc.setTextColor(140, 100, 60);
  doc.text('F-' + (i + 1), cx - 6, cy + fw / 2 + 8);
});
doc.setLineDashPattern([], 0);

doc.setDrawColor(160, 120, 80);
doc.setLineWidth(2);
doc.setLineDashPattern([6, 3], 0);
doc.line(120, 420, 720, 420);
doc.setFontSize(6);
doc.text('GB-2', 400, 435);
doc.setLineDashPattern([], 0);

doc.setFontSize(6);
doc.setTextColor(160, 120, 80);
doc.text('#5 @ 12" O.C. (TYP)', 130, 115);

const pdfOutput = doc.output('arraybuffer');
writeFileSync('static/sample-blueprint.pdf', Buffer.from(pdfOutput));
console.log('Generated static/sample-blueprint.pdf (4 pages)');
