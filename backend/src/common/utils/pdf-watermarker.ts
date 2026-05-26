import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import * as fs from 'fs';
import { randomUUID } from 'crypto';

export async function watermarkPdf(
  sourcePath: string,
  destPath: string,
  userEmail: string,
): Promise<void> {
  const sourceBytes = fs.readFileSync(sourcePath);
  const pdfDoc = await PDFDocument.load(sourceBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();
  const refId = randomUUID().slice(0, 8);

  for (const page of pages) {
    const { width, height } = page.getSize();

    // Diagonal watermark — ultra-faint (5% opacity)
    page.drawText(`LICENSED TO: ${userEmail}`, {
      x: width / 2 - 180,
      y: height / 2,
      size: 22,
      font,
      color: rgb(0.6, 0.6, 0.6),
      opacity: 0.05,
      rotate: degrees(-45),
    });

    // Footer watermark — slightly more visible (15% opacity)
    page.drawText(`Licensed to ${userEmail} | Ref: ${refId}`, {
      x: 40,
      y: 20,
      size: 7,
      font,
      color: rgb(0.5, 0.5, 0.5),
      opacity: 0.15,
    });
  }

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(destPath, pdfBytes);
}
