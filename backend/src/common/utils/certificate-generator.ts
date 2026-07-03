import {
  PDFDocument,
  PDFImage,
  PDFPage,
  PDFFont,
  rgb,
  StandardFonts,
  degrees,
} from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';

type CertificateFonts = {
  regular: PDFFont;
  bold: PDFFont;
  italic: PDFFont;
};

const A4_LANDSCAPE: [number, number] = [842, 595];

function resolveBrandLogoPath(): string | undefined {
  const candidates = [
    path.resolve(process.cwd(), '..', 'brandLogoLight.png'),
    path.resolve(process.cwd(), 'brandLogoLight.png'),
    path.resolve(process.cwd(), 'frontend', 'public', 'brandLogoLight.png'),
    path.resolve(
      process.cwd(),
      '..',
      'frontend',
      'public',
      'brandLogoLight.png',
    ),
    path.resolve(__dirname, '..', '..', '..', '..', 'brandLogoLight.png'),
    path.resolve(__dirname, '..', '..', '..', '..', '..', 'brandLogoLight.png'),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate));
}

async function embedBrandLogo(
  pdfDoc: PDFDocument,
): Promise<PDFImage | undefined> {
  const logoPath = resolveBrandLogoPath();
  if (!logoPath) return undefined;

  try {
    return await pdfDoc.embedPng(fs.readFileSync(logoPath));
  } catch {
    return undefined;
  }
}

function printableText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatIssueDate(issueDate: Date): string {
  return issueDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function textWidth(font: PDFFont, text: string, size: number) {
  return font.widthOfTextAtSize(text, size);
}

function fitText(
  font: PDFFont,
  text: string,
  maxWidth: number,
  preferredSize: number,
  minSize: number,
) {
  let size = preferredSize;
  while (size > minSize && textWidth(font, text, size) > maxWidth) {
    size -= 1;
  }
  return size;
}

function drawCenteredWithin(
  page: PDFPage,
  text: string,
  x: number,
  width: number,
  y: number,
  font: PDFFont,
  size: number,
  color = rgb(0.08, 0.1, 0.18),
) {
  page.drawText(text, {
    x: x + (width - textWidth(font, text, size)) / 2,
    y,
    size,
    font,
    color,
  });
}

function wrapText(
  font: PDFFont,
  text: string,
  size: number,
  maxWidth: number,
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;
    if (textWidth(font, nextLine, size) <= maxWidth) {
      currentLine = nextLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine) lines.push(currentLine);
  return lines;
}

function drawMetadataBlock(
  page: PDFPage,
  label: string,
  value: string,
  x: number,
  y: number,
  width: number,
  fonts: CertificateFonts,
  height = 48,
) {
  page.drawRectangle({
    x,
    y,
    width,
    height,
    borderColor: rgb(0.75, 0.83, 0.92),
    borderWidth: 1,
    color: rgb(0.975, 0.99, 1),
  });
  page.drawText(label.toUpperCase(), {
    x: x + 14,
    y: y + height - 19,
    size: 7.5,
    font: fonts.bold,
    color: rgb(0.33, 0.42, 0.54),
  });
  page.drawText(value, {
    x: x + 14,
    y: y + 13,
    size: fitText(fonts.regular, value, width - 28, 10, 7),
    font: fonts.regular,
    color: rgb(0.08, 0.1, 0.18),
  });
}

function drawBrandLogo(
  page: PDFPage,
  logo: PDFImage | undefined,
  x: number,
  y: number,
  maxWidth: number,
  maxHeight: number,
  opacity = 1,
) {
  if (!logo) return;

  const scale = Math.min(maxWidth / logo.width, maxHeight / logo.height);
  const width = logo.width * scale;
  const height = logo.height * scale;
  page.drawImage(logo, {
    x: x + (maxWidth - width) / 2,
    y: y + (maxHeight - height) / 2,
    width,
    height,
    opacity,
  });
}

const QR_VERSION = 6;
const QR_SIZE = 21 + (QR_VERSION - 1) * 4;
const QR_DATA_CODEWORDS = 136;
const QR_BLOCK_COUNT = 2;
const QR_DATA_CODEWORDS_PER_BLOCK = 68;
const QR_EC_CODEWORDS_PER_BLOCK = 18;
const QR_MASK_PATTERN = 2;
const QR_LOW_EC_FORMAT_BITS = 1;

type QrMatrix = {
  modules: boolean[][];
  reserved: boolean[][];
};

const GF_EXP = new Array<number>(512);
const GF_LOG = new Array<number>(256);
let gfValue = 1;
for (let i = 0; i < 255; i += 1) {
  GF_EXP[i] = gfValue;
  GF_LOG[gfValue] = i;
  gfValue <<= 1;
  if (gfValue & 0x100) gfValue ^= 0x11d;
}
for (let i = 255; i < 512; i += 1) GF_EXP[i] = GF_EXP[i - 255];

function gfMultiply(a: number, b: number) {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function createQrMatrix(): QrMatrix {
  return {
    modules: Array.from({ length: QR_SIZE }, () =>
      Array.from({ length: QR_SIZE }, () => false),
    ),
    reserved: Array.from({ length: QR_SIZE }, () =>
      Array.from({ length: QR_SIZE }, () => false),
    ),
  };
}

function setQrFunctionModule(
  matrix: QrMatrix,
  x: number,
  y: number,
  dark: boolean,
) {
  if (x < 0 || y < 0 || x >= QR_SIZE || y >= QR_SIZE) return;
  matrix.modules[y][x] = dark;
  matrix.reserved[y][x] = true;
}

function drawQrFinder(matrix: QrMatrix, left: number, top: number) {
  for (let y = -1; y <= 7; y += 1) {
    for (let x = -1; x <= 7; x += 1) {
      const absoluteX = left + x;
      const absoluteY = top + y;
      const isFinder =
        x >= 0 &&
        x <= 6 &&
        y >= 0 &&
        y <= 6 &&
        (x === 0 ||
          x === 6 ||
          y === 0 ||
          y === 6 ||
          (x >= 2 && x <= 4 && y >= 2 && y <= 4));
      setQrFunctionModule(matrix, absoluteX, absoluteY, isFinder);
    }
  }
}

function drawQrAlignment(matrix: QrMatrix, centerX: number, centerY: number) {
  for (let y = -2; y <= 2; y += 1) {
    for (let x = -2; x <= 2; x += 1) {
      const distance = Math.max(Math.abs(x), Math.abs(y));
      setQrFunctionModule(
        matrix,
        centerX + x,
        centerY + y,
        distance === 2 || distance === 0,
      );
    }
  }
}

function drawQrFunctionPatterns(matrix: QrMatrix) {
  drawQrFinder(matrix, 0, 0);
  drawQrFinder(matrix, QR_SIZE - 7, 0);
  drawQrFinder(matrix, 0, QR_SIZE - 7);

  for (let i = 8; i < QR_SIZE - 8; i += 1) {
    const dark = i % 2 === 0;
    setQrFunctionModule(matrix, i, 6, dark);
    setQrFunctionModule(matrix, 6, i, dark);
  }

  drawQrAlignment(matrix, QR_SIZE - 7, QR_SIZE - 7);
  setQrFunctionModule(matrix, 8, 4 * QR_VERSION + 9, true);
}

function appendQrBits(bits: number[], value: number, length: number) {
  for (let i = length - 1; i >= 0; i -= 1) {
    bits.push((value >>> i) & 1);
  }
}

function createQrDataCodewords(value: string): number[] {
  const bytes = Buffer.from(value, 'utf8');
  const maxByteLength = QR_DATA_CODEWORDS - 2;
  const dataBytes =
    bytes.length <= maxByteLength ? bytes : bytes.subarray(0, maxByteLength);
  const bits: number[] = [];
  appendQrBits(bits, 0x4, 4);
  appendQrBits(bits, dataBytes.length, 8);
  dataBytes.forEach((byte) => appendQrBits(bits, byte, 8));

  const capacityBits = QR_DATA_CODEWORDS * 8;
  appendQrBits(bits, 0, Math.min(4, capacityBits - bits.length));
  while (bits.length % 8 !== 0) bits.push(0);

  const codewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    codewords.push(
      bits.slice(i, i + 8).reduce((value, bit) => (value << 1) | bit, 0),
    );
  }
  for (
    let pad = 0xec;
    codewords.length < QR_DATA_CODEWORDS;
    pad ^= 0xec ^ 0x11
  ) {
    codewords.push(pad);
  }
  return codewords;
}

function createQrGeneratorPolynomial(degree: number) {
  let result = [1];
  for (let i = 0; i < degree; i += 1) {
    const next = new Array<number>(result.length + 1).fill(0);
    result.forEach((coefficient, index) => {
      next[index] ^= gfMultiply(coefficient, 1);
      next[index + 1] ^= gfMultiply(coefficient, GF_EXP[i]);
    });
    result = next;
  }
  return result;
}

function createQrErrorCorrection(data: number[], degree: number) {
  const generator = createQrGeneratorPolynomial(degree);
  const result = new Array<number>(degree).fill(0);

  data.forEach((codeword) => {
    const factor = codeword ^ result.shift()!;
    result.push(0);
    for (let i = 0; i < degree; i += 1) {
      result[i] ^= gfMultiply(generator[i + 1], factor);
    }
  });

  return result;
}

function createQrCodewords(value: string): number[] {
  const data = createQrDataCodewords(value);
  const blocks = Array.from({ length: QR_BLOCK_COUNT }, (_, index) =>
    data.slice(
      index * QR_DATA_CODEWORDS_PER_BLOCK,
      (index + 1) * QR_DATA_CODEWORDS_PER_BLOCK,
    ),
  );
  const errorBlocks = blocks.map((block) =>
    createQrErrorCorrection(block, QR_EC_CODEWORDS_PER_BLOCK),
  );
  const result: number[] = [];

  for (let i = 0; i < QR_DATA_CODEWORDS_PER_BLOCK; i += 1) {
    blocks.forEach((block) => result.push(block[i]));
  }
  for (let i = 0; i < QR_EC_CODEWORDS_PER_BLOCK; i += 1) {
    errorBlocks.forEach((block) => result.push(block[i]));
  }

  return result;
}

function getQrMask(mask: number, x: number, y: number) {
  switch (mask) {
    case 0:
      return (x + y) % 2 === 0;
    case 1:
      return y % 2 === 0;
    case 2:
      return x % 3 === 0;
    case 3:
      return (x + y) % 3 === 0;
    case 4:
      return (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0;
    case 5:
      return ((x * y) % 2) + ((x * y) % 3) === 0;
    case 6:
      return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
    case 7:
      return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
    default:
      return false;
  }
}

function drawQrFormatBits(matrix: QrMatrix) {
  const data = (QR_LOW_EC_FORMAT_BITS << 3) | QR_MASK_PATTERN;
  let remainder = data;
  for (let i = 0; i < 10; i += 1) {
    remainder = (remainder << 1) ^ (((remainder >>> 9) & 1) * 0x537);
  }
  const bits = ((data << 10) | remainder) ^ 0x5412;
  const bit = (index: number) => ((bits >>> index) & 1) !== 0;

  for (let i = 0; i <= 5; i += 1) setQrFunctionModule(matrix, 8, i, bit(i));
  setQrFunctionModule(matrix, 8, 7, bit(6));
  setQrFunctionModule(matrix, 8, 8, bit(7));
  setQrFunctionModule(matrix, 7, 8, bit(8));
  for (let i = 9; i < 15; i += 1)
    setQrFunctionModule(matrix, 14 - i, 8, bit(i));
  for (let i = 0; i < 8; i += 1)
    setQrFunctionModule(matrix, QR_SIZE - 1 - i, 8, bit(i));
  for (let i = 8; i < 15; i += 1)
    setQrFunctionModule(matrix, 8, QR_SIZE - 15 + i, bit(i));
  setQrFunctionModule(matrix, 8, QR_SIZE - 8, true);
}

function createQrModules(value: string): boolean[][] {
  const matrix = createQrMatrix();
  drawQrFunctionPatterns(matrix);
  drawQrFormatBits(matrix);

  const bits = createQrCodewords(value).flatMap((codeword) =>
    Array.from({ length: 8 }, (_, index) => (codeword >>> (7 - index)) & 1),
  );
  let bitIndex = 0;
  let upward = true;

  for (let right = QR_SIZE - 1; right >= 1; right -= 2) {
    if (right === 6) right -= 1;
    for (let vertical = 0; vertical < QR_SIZE; vertical += 1) {
      const y = upward ? QR_SIZE - 1 - vertical : vertical;
      for (let offset = 0; offset < 2; offset += 1) {
        const x = right - offset;
        if (matrix.reserved[y][x]) continue;
        const dark = (bits[bitIndex] ?? 0) === 1;
        matrix.modules[y][x] = dark !== getQrMask(QR_MASK_PATTERN, x, y);
        bitIndex += 1;
      }
    }
    upward = !upward;
  }

  return matrix.modules;
}

function drawVerificationQr(
  page: PDFPage,
  verifyUrl: string,
  x: number,
  y: number,
  size: number,
) {
  const modules = createQrModules(verifyUrl);
  const quietModules = 4;
  const totalModules = modules.length + quietModules * 2;
  const moduleSize = size / totalModules;

  page.drawRectangle({
    x,
    y,
    width: size,
    height: size,
    color: rgb(1, 1, 1),
    borderColor: rgb(0.93, 0.78, 0.35),
    borderWidth: 0.8,
  });

  modules.forEach((row, rowIndex) => {
    row.forEach((dark, columnIndex) => {
      if (!dark) return;
      page.drawRectangle({
        x: x + (columnIndex + quietModules) * moduleSize,
        y: y + (totalModules - quietModules - rowIndex - 1) * moduleSize,
        width: moduleSize + 0.03,
        height: moduleSize + 0.03,
        color: rgb(0.02, 0.08, 0.1),
      });
    });
  });
}

function drawPill(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  width: number,
  fonts: CertificateFonts,
) {
  page.drawRectangle({
    x,
    y,
    width,
    height: 22,
    borderColor: rgb(0.75, 0.83, 0.92),
    borderWidth: 0.8,
    color: rgb(0.985, 0.995, 1),
  });
  page.drawText(text.toUpperCase(), {
    x: x + (width - textWidth(fonts.bold, text.toUpperCase(), 7.5)) / 2,
    y: y + 7.4,
    size: 7.5,
    font: fonts.bold,
    color: rgb(0.33, 0.42, 0.54),
  });
}

function drawSeal(
  page: PDFPage,
  fonts: CertificateFonts,
  centerX: number,
  centerY: number,
) {
  page.drawCircle({
    x: centerX,
    y: centerY,
    size: 48,
    color: rgb(0.02, 0.17, 0.28),
  });
  page.drawCircle({
    x: centerX,
    y: centerY,
    size: 42,
    borderColor: rgb(0.93, 0.78, 0.35),
    borderWidth: 2,
  });
  page.drawCircle({
    x: centerX,
    y: centerY,
    size: 30,
    color: rgb(0.04, 0.32, 0.42),
  });
  page.drawText('MH', {
    x: centerX - textWidth(fonts.bold, 'MH', 24) / 2,
    y: centerY - 7,
    size: 24,
    font: fonts.bold,
    color: rgb(1, 1, 1),
  });
  page.drawText('VERIFIED', {
    x: centerX - textWidth(fonts.bold, 'VERIFIED', 7) / 2,
    y: centerY - 28,
    size: 7,
    font: fonts.bold,
    color: rgb(0.93, 0.78, 0.35),
  });
}

function drawCertificateDesign(
  page: PDFPage,
  fonts: CertificateFonts,
  input: {
    holderName: string;
    courseTitle: string;
    certificateId: string;
    issueDate: Date;
    verifyUrl: string;
    brandLogo?: PDFImage;
  },
) {
  const { width, height } = page.getSize();
  const holderName = printableText(input.holderName) || 'Credential Holder';
  const courseTitle =
    printableText(input.courseTitle) || 'MultiHAT Academy Course';
  const certificateId = printableText(input.certificateId);
  const verifyUrl = printableText(input.verifyUrl);
  const issueDate = formatIssueDate(input.issueDate);

  const navy = rgb(0.015, 0.15, 0.24);
  const teal = rgb(6 / 255, 91 / 255, 114 / 255);
  const cyan = rgb(0.02, 0.48, 0.62);
  const gold = rgb(0.93, 0.78, 0.35);
  const ink = rgb(0.07, 0.09, 0.16);
  const muted = rgb(0.33, 0.42, 0.54);
  const paper = rgb(0.99, 0.995, 0.985);
  const railX = 19;
  const railWidth = 118;
  const railRight = railX + railWidth;
  const dividerWidth = 5;
  const headerX = railRight + dividerWidth;
  const contentX = headerX + 26;
  const contentRight = width - 46;
  const contentWidth = contentRight - contentX;

  page.drawRectangle({ x: 0, y: 0, width, height, color: paper });
  page.drawRectangle({
    x: 19,
    y: 19,
    width: width - 38,
    height: height - 38,
    borderColor: navy,
    borderWidth: 2.6,
  });
  page.drawRectangle({
    x: 32,
    y: 32,
    width: width - 64,
    height: height - 64,
    borderColor: gold,
    borderWidth: 1,
  });
  page.drawRectangle({
    x: 46,
    y: 46,
    width: width - 92,
    height: height - 92,
    borderColor: rgb(0.74, 0.84, 0.9),
    borderWidth: 0.6,
  });

  page.drawRectangle({
    x: railX,
    y: 19,
    width: railWidth,
    height: height - 38,
    color: teal,
  });
  page.drawRectangle({
    x: railRight,
    y: 19,
    width: dividerWidth,
    height: height - 38,
    color: gold,
  });
  page.drawRectangle({
    x: headerX,
    y: height - 82,
    width: width - headerX - 19,
    height: 63,
    color: navy,
  });
  page.drawRectangle({
    x: headerX,
    y: height - 84,
    width: width - headerX - 19,
    height: 2,
    color: gold,
  });

  drawCenteredWithin(
    page,
    'SCAN TO VERIFY',
    railX,
    railWidth,
    height - 112,
    fonts.bold,
    7.5,
    gold,
  );
  drawVerificationQr(page, verifyUrl, railX + 17, height - 210, 84);
  drawCenteredWithin(
    page,
    'VERIFY ONLINE',
    railX,
    railWidth,
    height - 228,
    fonts.bold,
    7,
    rgb(0.82, 0.94, 0.96),
  );
  drawSeal(page, fonts, railX + railWidth / 2, 253);
  drawCenteredWithin(
    page,
    `CREDENTIAL ${input.issueDate.getFullYear()}`,
    railX,
    railWidth,
    58,
    fonts.bold,
    7,
    rgb(0.82, 0.94, 0.96),
  );

  page.drawText('MULTIHAT ACADEMY', {
    x: contentX,
    y: height - 57,
    size: 15,
    font: fonts.bold,
    color: rgb(1, 1, 1),
  });
  page.drawText('VERIFIED TECHNICAL CREDENTIAL', {
    x:
      contentRight - textWidth(fonts.bold, 'VERIFIED TECHNICAL CREDENTIAL', 10),
    y: height - 55,
    size: 10,
    font: fonts.bold,
    color: gold,
  });

  drawBrandLogo(page, input.brandLogo, width - 330, 250, 235, 156, 0.08);
  page.drawText('MULTIHAT ACADEMY', {
    x: contentX + 72,
    y: 280,
    size: 56,
    font: fonts.bold,
    color: rgb(0.92, 0.96, 0.97),
    rotate: degrees(16),
    opacity: 0.55,
  });

  drawCenteredWithin(
    page,
    'CERTIFICATE OF COMPLETION',
    contentX,
    contentWidth,
    height - 151,
    fonts.bold,
    31,
    navy,
  );
  drawCenteredWithin(
    page,
    'This verified credential is proudly awarded to',
    contentX,
    contentWidth,
    height - 188,
    fonts.italic,
    13,
    muted,
  );

  const holderText = holderName.toUpperCase();
  const holderSize = fitText(fonts.bold, holderText, contentWidth - 82, 40, 22);
  drawCenteredWithin(
    page,
    holderText,
    contentX,
    contentWidth,
    height - 247,
    fonts.bold,
    holderSize,
    cyan,
  );
  page.drawLine({
    start: { x: contentX + 70, y: height - 264 },
    end: { x: contentRight - 70, y: height - 264 },
    thickness: 1.2,
    color: gold,
  });

  drawCenteredWithin(
    page,
    'for successfully completing the professional learning track',
    contentX,
    contentWidth,
    height - 304,
    fonts.regular,
    12,
    muted,
  );

  const panelX = contentX + 36;
  const panelY = 216;
  const panelWidth = contentWidth - 72;
  const panelHeight = 62;
  page.drawRectangle({
    x: panelX,
    y: panelY,
    width: panelWidth,
    height: panelHeight,
    color: rgb(0.965, 0.988, 0.995),
    borderColor: rgb(0.72, 0.82, 0.88),
    borderWidth: 0.9,
  });
  page.drawLine({
    start: { x: panelX + 14, y: panelY + panelHeight - 8 },
    end: { x: panelX + panelWidth - 14, y: panelY + panelHeight - 8 },
    thickness: 0.6,
    color: gold,
  });
  const courseLines = wrapText(
    fonts.bold,
    courseTitle,
    19,
    panelWidth - 64,
  ).slice(0, 2);
  const courseLineHeight = 22;
  const firstCourseY =
    panelY +
    panelHeight / 2 +
    ((courseLines.length - 1) * courseLineHeight) / 2 -
    8;
  courseLines.forEach((line, index) => {
    drawCenteredWithin(
      page,
      line,
      panelX,
      panelWidth,
      firstCourseY - index * courseLineHeight,
      fonts.bold,
      19,
      ink,
    );
  });

  const pillGap = 14;
  const pillWidth = (panelWidth - pillGap * 2) / 3;
  drawPill(page, 'Assessment Passed', panelX, 181, pillWidth, fonts);
  drawPill(
    page,
    'Public Verification',
    panelX + pillWidth + pillGap,
    181,
    pillWidth,
    fonts,
  );
  drawPill(
    page,
    'Printable Credential',
    panelX + (pillWidth + pillGap) * 2,
    181,
    pillWidth,
    fonts,
  );

  const signatureX = contentX + 18;
  page.drawLine({
    start: { x: signatureX, y: 144 },
    end: { x: signatureX + 170, y: 144 },
    thickness: 0.8,
    color: rgb(0.45, 0.54, 0.65),
  });
  page.drawText('Sagar Biswas', {
    x: signatureX + 4,
    y: 126,
    size: 11,
    font: fonts.bold,
    color: ink,
  });
  page.drawText('Founder, MultiHAT Academy', {
    x: signatureX + 4,
    y: 110,
    size: 8.5,
    font: fonts.regular,
    color: muted,
  });
  page.drawText('Authorized signature', {
    x: signatureX + 4,
    y: 88,
    size: 7.5,
    font: fonts.regular,
    color: rgb(0.45, 0.54, 0.65),
  });

  const metadataX = contentX + 280;
  drawMetadataBlock(page, 'Issue Date', issueDate, metadataX, 112, 132, fonts);
  drawMetadataBlock(
    page,
    'Certificate ID',
    certificateId,
    metadataX + 146,
    112,
    192,
    fonts,
  );
  drawMetadataBlock(
    page,
    'Verify Online',
    verifyUrl,
    metadataX,
    52,
    338,
    fonts,
    48,
  );

  wrapText(
    fonts.regular,
    'A verified MultiHAT Academy credential for learning, proof, and public showcase.',
    7.4,
    235,
  )
    .slice(0, 2)
    .forEach((line, index) => {
      page.drawText(line, {
        x: signatureX + 4,
        y: 67 - index * 10,
        size: 7.4,
        font: fonts.regular,
        color: muted,
      });
    });
}

export async function generateCertificatePdf(
  holderName: string,
  courseTitle: string,
  certificateId: string,
  templateDir: string,
  outputDir: string,
  frontendUrl = 'https://academy.multihat.dev',
  issueDate = new Date(),
): Promise<Buffer> {
  const templatePath = path.join(templateDir, 'certificate-template.pdf');

  let pdfDoc: PDFDocument;
  if (fs.existsSync(templatePath)) {
    const templateBytes = fs.readFileSync(templatePath);
    pdfDoc = await PDFDocument.load(templateBytes);
  } else {
    pdfDoc = await PDFDocument.create();
    pdfDoc.addPage(A4_LANDSCAPE);
  }

  const page = pdfDoc.getPages()[0] ?? pdfDoc.addPage(A4_LANDSCAPE);
  const fonts = {
    regular: await pdfDoc.embedFont(StandardFonts.Helvetica),
    bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
    italic: await pdfDoc.embedFont(StandardFonts.HelveticaOblique),
  };
  const brandLogo = await embedBrandLogo(pdfDoc);
  const verifyUrl = `${frontendUrl.replace(/\/$/, '')}/verify/${certificateId}`;

  drawCertificateDesign(page, fonts, {
    holderName,
    courseTitle,
    certificateId,
    issueDate,
    verifyUrl,
    brandLogo,
  });

  const pdfBytes = await pdfDoc.save();
  const outputPath = path.join(outputDir, `cert-${certificateId}.pdf`);

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputPath, pdfBytes);

  return Buffer.from(pdfBytes);
}
