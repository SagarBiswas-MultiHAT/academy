/*
  Warnings:

  - A unique constraint covering the columns `[gateway_tran_id]` on the table `wallet_transactions` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "wallet_transactions" ADD COLUMN     "gateway_tran_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "wallet_transactions_gateway_tran_id_key" ON "wallet_transactions"("gateway_tran_id");
