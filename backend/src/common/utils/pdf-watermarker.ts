import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import * as fs from 'fs';

export async function watermarkPdf(
  sourcePath: string,
  destPath: string,
  userEmail: string,
  orderRef: string,
): Promise<void> {
  const sourceBytes = fs.readFileSync(sourcePath);
  const pdfDoc = await PDFDocument.load(sourceBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pages = pdfDoc.getPages();
  const footerRef = orderRef.slice(0, 12).toUpperCase();

  for (const page of pages) {
    const { width, height } = page.getSize();

    const tileText = `LICENSED TO ${userEmail.toUpperCase()}`;
    const tileSize = 26;
    const horizontalStep = 260;
    const verticalStep = 170;

    for (let row = -1; row <= Math.ceil(height / verticalStep) + 1; row += 1) {
      for (let column = -1; column <= Math.ceil(width / horizontalStep) + 1; column += 1) {
        page.drawText(tileText, {
          x: column * horizontalStep - 80,
          y: row * verticalStep + 60,
          size: tileSize,
          font: boldFont,
          color: rgb(0.55, 0.55, 0.55),
          opacity: 0.065,
          rotate: degrees(-45),
        });
      }
    }

    page.drawText(`Licensed to: ${userEmail} | Order: ${footerRef} | MultiHAT Academy`, {
      x: 36,
      y: 18,
      size: 7.5,
      font,
      color: rgb(0.35, 0.35, 0.35),
      opacity: 0.85,
    });
  }

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(destPath, pdfBytes);
}
