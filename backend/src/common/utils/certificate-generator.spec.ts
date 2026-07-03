import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { PDFDocument } from 'pdf-lib';

import { generateCertificatePdf } from './certificate-generator';

describe('generateCertificatePdf', () => {
  it('creates a fallback certificate PDF and writes it to the output directory', async () => {
    const templateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'missing-cert-template-'));
    const rootOutputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cert-output-'));
    const outputDir = path.join(rootOutputDir, 'generated', 'certificates');

    const pdfBuffer = await generateCertificatePdf(
      'Ada Lovelace',
      'Google Dorks Complete Handbook',
      'CERT-TEST-1',
      templateDir,
      outputDir,
      'http://localhost:3000/',
    );

    const outputPath = path.join(outputDir, 'cert-CERT-TEST-1.pdf');
    const pdfDoc = await PDFDocument.load(pdfBuffer);

    expect(fs.existsSync(outputPath)).toBe(true);
    expect(pdfBuffer.length).toBeGreaterThan(0);
    expect(pdfDoc.getPageCount()).toBe(1);

    fs.rmSync(templateDir, { recursive: true, force: true });
    fs.rmSync(rootOutputDir, { recursive: true, force: true });
  });
});
