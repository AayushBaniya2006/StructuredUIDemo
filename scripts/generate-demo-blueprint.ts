import { jsPDF } from 'jspdf';
import { writeFileSync } from 'fs';

const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a3' });
const W = doc.internal.pageSize.getWidth();
const H = doc.internal.pageSize.getHeight();

// Helper functions for drawing blueprint elements
function drawGrid(doc: any, cols: string[], rows: string[]) {
	doc.setDrawColor(200, 200, 220);
	doc.setLineWidth(0.3);
	// Draw column lines
	cols.forEach((label, i) => {
		const x = 60 + i * ((W - 120) / (cols.length - 1));
		doc.line(x, 40, x, H - 40);
		doc.setFontSize(8);
		doc.setTextColor(150, 150, 170);
		doc.text(label, x - 3, 35);
	});
	// Draw row lines
	rows.forEach((label, i) => {
		const y = 50 + i * ((H - 100) / (rows.length - 1));
		doc.line(60, y, W - 60, y);
		doc.text(label, 48, y + 3);
	});
}

function drawTitleBlock(doc: any, title: string, sheetNum: number, scale: string) {
	doc.setDrawColor(50, 50, 50);
	doc.setLineWidth(1.5);
	doc.rect(30, 20, W - 60, H - 40);

	// Title block
	const tbW = 280;
	const tbH = 60;
	const tbX = W - 30 - tbW;
	const tbY = H - 20 - tbH;
	doc.setLineWidth(0.8);
	doc.rect(tbX, tbY, tbW, tbH);
	doc.setFontSize(10);
	doc.setTextColor(50, 50, 50);
	doc.text('Structured AI Demo', tbX + 10, tbY + 15);
	doc.setFontSize(8);
	doc.text(`Sheet ${sheetNum} of 4`, tbX + 10, tbY + 28);
	doc.setFontSize(12);
	doc.setFont('helvetica', 'bold');
	doc.text(title, tbX + 10, tbY + 48);
	doc.setFont('helvetica', 'normal');
	doc.text(`Scale: ${scale}`, tbX + 180, tbY + 35);
}

function drawRoom(doc: any, x: number, y: number, w: number, h: number, label: string) {
	doc.setDrawColor(60, 60, 80);
	doc.setLineWidth(1);
	doc.rect(x, y, w, h);
	doc.setFontSize(9);
	doc.setTextColor(60, 60, 80);
	const lines = label.split('\n');
	doc.text(lines[0], x + w / 2, y + h / 2 - (lines.length > 1 ? 5 : 0), { align: 'center' });
	if (lines.length > 1) {
		doc.text(lines[1], x + w / 2, y + h / 2 + 7, { align: 'center' });
	}
}

function drawDoor(doc: any, x: number, y: number, vertical = true) {
	doc.setDrawColor(60, 60, 80);
	doc.setLineWidth(0.8);
	const size = 24;
	if (vertical) {
		doc.line(x, y, x, y + size);
		doc.setDrawColor(150, 150, 170);
		doc.setLineDashPattern([2, 2], 0);
		doc.line(x, y, x + size * 0.7, y + size * 0.5);
	} else {
		doc.line(x, y, x + size, y);
		doc.setDrawColor(150, 150, 170);
		doc.setLineDashPattern([2, 2], 0);
		doc.line(x, y, x + size * 0.5, y + size * 0.7);
	}
	doc.setLineDashPattern([], 0);
}

// PAGE 1: Ground Floor Plan
drawGrid(doc, ['A', 'B', 'C', 'D', 'E', 'F'], ['1', '2', '3', '4', '5']);
drawTitleBlock(doc, 'GROUND FLOOR PLAN - A1.01', 1, '1/4" = 1\'-0"');

// Rooms
drawRoom(doc, 100, 80, 250, 180, 'LOBBY\n101');
drawRoom(doc, 100, 260, 120, 150, 'STORAGE\n102');
drawRoom(doc, 220, 260, 130, 150, 'OFFICE\n103');
drawRoom(doc, 380, 80, 200, 180, 'CONFERENCE\n104');
drawRoom(doc, 380, 260, 200, 150, 'BREAK ROOM\n105');
drawRoom(doc, 610, 80, 180, 330, 'OPEN OFFICE\n106');
drawRoom(doc, 820, 80, 120, 160, 'STAIRWELL\nS-1');
drawRoom(doc, 820, 240, 120, 170, 'RESTROOM\n107');

// Doors (intentionally missing swing annotations for QA issues)
drawDoor(doc, 340, 160, true); // Missing swing
drawDoor(doc, 200, 260, false);
drawDoor(doc, 330, 330, true);
drawDoor(doc, 575, 200, true);

// Windows
doc.setDrawColor(100, 140, 200);
doc.setLineWidth(1.5);
doc.line(100, 80, 180, 80);
doc.line(790, 80, 870, 80);
doc.line(610, 410, 710, 410);

// Dimension lines (some gaps for QA issues)
doc.setDrawColor(80, 80, 100);
doc.setLineWidth(0.3);
doc.line(100, 440, 350, 440); // Dimension
doc.line(390, 440, 550, 440); // GAP - issue
doc.line(600, 440, 750, 440);
doc.setFontSize(7);
doc.text("25'-0\"", 200, 435);

// PAGE 2: First Floor Plan
doc.addPage();
drawGrid(doc, ['A', 'B', 'C', 'D', 'E', 'F'], ['1', '2', '3', '4', '5']);
drawTitleBlock(doc, 'FIRST FLOOR PLAN - A1.02', 2, '1/4" = 1\'-0"');

drawRoom(doc, 100, 80, 200, 200, 'OFFICE\n201');
drawRoom(doc, 300, 80, 140, 200, 'CORRIDOR'); // Too narrow - issue
drawRoom(doc, 440, 80, 180, 200, 'OFFICE\n202');
drawRoom(doc, 100, 280, 200, 130, 'MEETING\n203');
drawRoom(doc, 440, 280, 180, 130, 'BATHROOM\n204'); // Missing vent - issue
drawRoom(doc, 650, 80, 200, 330, 'OPEN OFFICE\n205');
drawRoom(doc, 880, 80, 100, 160, 'STAIRWELL\nS-2');
drawRoom(doc, 880, 240, 100, 170, 'STORAGE\n206');

// Doors
drawDoor(doc, 295, 170, true);
drawDoor(doc, 430, 170, true);
drawDoor(doc, 200, 280, false);
drawDoor(doc, 530, 280, false);

// Windows
doc.setDrawColor(100, 140, 200);
doc.setLineWidth(1.5);
doc.line(100, 80, 160, 80);
doc.line(440, 80, 500, 80);

// PAGE 3: MEP Overlay
doc.addPage();
drawGrid(doc, ['A', 'B', 'C', 'D', 'E', 'F'], ['1', '2', '3', '4', '5']);
drawTitleBlock(doc, 'MEP OVERLAY - M1.01', 3, '1/4" = 1\'-0"');

// HVAC ducts (clash issues)
doc.setDrawColor(220, 100, 100);
doc.setFillColor(255, 230, 230);
doc.setLineWidth(1);
doc.rect(80, 160, 700, 30, 'FD'); // Main supply
doc.setFontSize(7);
doc.setTextColor(180, 60, 60);
doc.text('24" SUPPLY DUCT', 350, 180);

// Clash: duct crosses beam
doc.setDrawColor(220, 100, 100);
doc.rect(250, 140, 12, 80, 'FD'); // BEAM in wrong place - clash
doc.setDrawColor(100, 100, 100);
doc.setFillColor(220, 220, 220);
doc.rect(240, 140, 30, 30, 'FD'); // Beam

// Return duct (size mismatch)
doc.setDrawColor(100, 100, 220);
doc.setFillColor(230, 230, 255);
doc.rect(80, 350, 500, 25, 'FD');
doc.text('18x12 RETURN AIR DUCT', 250, 367);

// Electrical conduit (clash with plumbing)
doc.setDrawColor(60, 180, 60);
doc.setLineWidth(2);
doc.setLineDashPattern([8, 4], 0);
doc.line(100, 260, 800, 260);
doc.setFontSize(6);
doc.text('4" WASTE PIPE', 400, 245);

doc.setDrawColor(200, 150, 50);
doc.setLineWidth(1);
doc.setLineDashPattern([3, 3], 0);
doc.line(100, 265, 800, 265); // Too close to pipe - clash
doc.text('2" ELEC CONDUIT', 400, 280);

// Fire damper missing (code violation)
doc.setDrawColor(100, 100, 220);
doc.setLineWidth(2);
doc.line(80, 380, 500, 380);
doc.setFontSize(6);
doc.setTextColor(60, 60, 180);
doc.text('SUPPLY DUCT (NO DAMPER)', 250, 395);

// PAGE 4: Structural Plan
doc.addPage();
drawGrid(doc, ['A', 'B', 'C', 'D', 'E', 'F'], ['1', '2', '3', '4', '5']);
drawTitleBlock(doc, 'STRUCTURAL PLAN - S1.01', 4, '1/4" = 1\'-0"');

// Columns
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
	doc.text(`C-${i + 1}`, cx - 6, cy - 12);
});

// Beams
doc.setLineWidth(3);
doc.setDrawColor(120, 120, 120);
// Horizontal beams
for (let row = 0; row < 3; row++) {
	const y = 100 + row * 160;
	for (let col = 0; col < 3; col++) {
		const x1 = 120 + col * 200;
		doc.line(x1, y, x1 + 200, y);
	}
}
// Vertical beams
for (let col = 0; col < 4; col++) {
	const x = 120 + col * 200;
	for (let row = 0; row < 2; row++) {
		const y1 = 100 + row * 160;
		doc.line(x, y1, x, y1 + 160);
	}
}

// Footings (undersized issue)
doc.setDrawColor(140, 100, 60);
doc.setLineWidth(1);
doc.setLineDashPattern([4, 4], 0);
colPositions.forEach(([cx, cy], i) => {
	const fw = i === 8 ? 36 : 48; // F-4 intentionally undersized
	doc.rect(cx - fw / 2, cy - fw / 2, fw, fw);
	doc.setFontSize(5);
	doc.text(`F-${i + 1}`, cx - 6, cy + fw / 2 + 8);
});
doc.setLineDashPattern([], 0);

// Grade beams
doc.setDrawColor(160, 120, 80);
doc.setLineWidth(2);
doc.setLineDashPattern([6, 3], 0);
doc.line(120, 420, 720, 420);
doc.setFontSize(6);
doc.text('GB-2', 400, 435);

// Save
const pdfOutput = doc.output('arraybuffer');
writeFileSync('static/demo-blueprint.pdf', Buffer.from(pdfOutput));
console.log('Generated static/demo-blueprint.pdf (4 pages)');
