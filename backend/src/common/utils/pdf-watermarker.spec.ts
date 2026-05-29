import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { PDFDocument } from 'pdf-lib';

import { watermarkPdf } from './pdf-watermarker';

describe('watermarkPdf', () => {
  it('keeps the same page count as the source PDF', async () => {
    const sourcePath = path.resolve(process.cwd(), '..', 'books', 'Google_Dorks_Complete_Handbook', 'Google_Dorks_Complete_Handbook.pdf');
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'licensed-pdf-'));
    const outputPath = path.join(tempDir, 'watermarked.pdf');

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