-- AlterTable
ALTER TABLE "coupons" ADD COLUMN     "includes_pdf" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "includes_pdf" BOOLEAN NOT NULL DEFAULT false;
