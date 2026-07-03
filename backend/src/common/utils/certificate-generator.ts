import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';

export async function generateCertificatePdf(
  holderName: string,
  courseTitle: string,
  certificateId: string,
  templateDir: string,
  outputDir: string,
  frontendUrl = 'https://academy.multihat.dev',
): Promise<Buffer> {
  const templatePath = path.join(templateDir, 'certificate-template.pdf');

  let pdfDoc: PDFDocument;
  if (fs.existsSync(templatePath)) {
    const templateBytes = fs.readFileSync(templatePath);
    pdfDoc = await PDFDocument.load(templateBytes);
  } else {
    // Fallback: create blank landscape A4
    pdfDoc = await PDFDocument.create();
    pdfDoc.addPage([842, 595]);
  }

  const page = pdfDoc.getPages()[0];
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Title
  page.drawText('CERTIFICATE OF ACCOMPLISHMENT', {
    x: 180, y: 450, size: 28, font: boldFont, color: rgb(0.1, 0.1, 0.2),
  });

  // Subtitle
  page.drawText('This credential is proudly presented to:', {
    x: 270, y: 370, size: 14, font: regularFont, color: rgb(0.3, 0.3, 0.3),
  });

  // Holder name
  page.drawText(holderName.toUpperCase(), {
    x: 250, y: 310, size: 24, font: boldFont, color: rgb(0.04, 0.52, 0.89),
  });

  // Course title
  page.drawText(`for successfully completing: ${courseTitle}`, {
    x: 200, y: 250, size: 14, font: regularFont, color: rgb(0.3, 0.3, 0.3),
  });

  // Date & verification
  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  page.drawText(`Issue Date: ${dateStr}`, {
    x: 100, y: 120, size: 10, font: regularFont, color: rgb(0.5, 0.5, 0.5),
  });
  page.drawText(`Verify: ${frontendUrl.replace(/\/$/, '')}/verify/${certificateId}`, {
    x: 420, y: 120, size: 10, font: regularFont, color: rgb(0.5, 0.5, 0.5),
  });

  const pdfBytes = await pdfDoc.save();
  const outputPath = path.join(outputDir, `cert-${certificateId}.pdf`);

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputPath, pdfBytes);

  return Buffer.from(pdfBytes);
}
