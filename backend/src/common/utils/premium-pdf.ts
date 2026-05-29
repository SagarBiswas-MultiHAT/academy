import * as fs from 'fs';
import * as path from 'path';

import { watermarkPdf } from './pdf-watermarker';

export type PremiumPdfProduct = {
  slug: string;
  sourcePdfPath: string;
  generatedDir: string;
  attachmentFilename: string;
  displayName: string;
  requiresGatewayPayment: boolean;
};

const baseDir = process.cwd();

export const PREMIUM_PDF_PRODUCTS: Record<string, PremiumPdfProduct> = {
  'google-dorks-complete-handbook': {
    slug: 'google-dorks-complete-handbook',
    sourcePdfPath: path.resolve(baseDir, '..', 'books', 'Google_Dorks_Complete_Handbook', 'Google_Dorks_Complete_Handbook.pdf'),
    generatedDir: path.resolve(baseDir, 'generated', 'ebooks'),
    attachmentFilename: 'Google_Dorks_Complete_OSINT_Handbook_Licensed.pdf',
    displayName: 'Google Dorks: The Complete OSINT Handbook',
    requiresGatewayPayment: true,
  },
};

export function getPremiumPdfProductBySlug(slug: string): PremiumPdfProduct | undefined {
  return PREMIUM_PDF_PRODUCTS[slug];
}

export function isPremiumPdfProduct(slug: string): boolean {
  return Boolean(getPremiumPdfProductBySlug(slug));
}

export function getPremiumPdfOrderRef(orderId: string, aamarpayTranId?: string | null): string {
  return aamarpayTranId?.trim() || orderId;
}

export function getPremiumPdfShortRef(orderId: string, aamarpayTranId?: string | null): string {
  return getPremiumPdfOrderRef(orderId, aamarpayTranId).slice(0, 12).toUpperCase();
}

export function getPremiumPdfOutputPath(orderId: string, product: PremiumPdfProduct): string {
  return path.join(product.generatedDir, `${product.slug}-${orderId}.pdf`);
}

export async function ensurePremiumPdfFile(params: {
  product: PremiumPdfProduct;
  orderId: string;
  aamarpayTranId?: string | null;
  buyerEmail: string;
}): Promise<string> {
  const { product, orderId, aamarpayTranId, buyerEmail } = params;
  const outputPath = getPremiumPdfOutputPath(orderId, product);

  if (fs.existsSync(outputPath)) {
    return outputPath;
  }

  fs.mkdirSync(product.generatedDir, { recursive: true });
  await watermarkPdf(product.sourcePdfPath, outputPath, buyerEmail, getPremiumPdfShortRef(orderId, aamarpayTranId));
  return outputPath;
}