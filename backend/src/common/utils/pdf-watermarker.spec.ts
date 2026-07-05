import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { PDFDocument, StandardFonts } from 'pdf-lib';

import { watermarkPdf } from './pdf-watermarker';

async function createSourcePdf(filePath: string): Promise<void> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const firstPage = pdfDoc.addPage([595, 842]);
  firstPage.drawText('Source page 1', {
    x: 48,
    y: 780,
    size: 18,
    font,
  });

  const secondPage = pdfDoc.addPage([595, 842]);
  secondPage.drawText('Source page 2', {
    x: 48,
    y: 780,
    size: 18,
    font,
  });

  const bytes = await pdfDoc.save();
  fs.writeFileSync(filePath, bytes);
}

describe('watermarkPdf', () => {
  it('keeps the same page count as the source PDF', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'licensed-pdf-'));
    const sourcePath = path.join(tempDir, 'source.pdf');
    const outputPath = path.join(tempDir, 'watermarked.pdf');

    await createSourcePdf(sourcePath);

    await watermarkPdf(sourcePath, outputPath, 'buyer@example.com', 'ORDER-REF-1234');

    const sourceBytes = fs.readFileSync(sourcePath);
    const outputBytes = fs.readFileSync(outputPath);
    const sourceDoc = await PDFDocument.load(sourceBytes);
    const outputDoc = await PDFDocument.load(outputBytes);

    expect(outputDoc.getPageCount()).toBe(sourceDoc.getPageCount());
    expect(fs.existsSync(outputPath)).toBe(true);

    fs.rmSync(tempDir, { recursive: true, force: true });
  }, 30000);
});