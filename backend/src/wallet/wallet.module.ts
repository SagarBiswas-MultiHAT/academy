import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [PaymentsModule],
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService], // Exported for use by OrdersModule, ReferralsModule, ShowcasesModule
})
export class WalletModule {}
