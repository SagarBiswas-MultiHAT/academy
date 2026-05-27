import { Module, forwardRef } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [forwardRef(() => PaymentsModule)],
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService], // Exported for use by OrdersModule, ReferralsModule, ShowcasesModule
})
export class WalletModule {}
