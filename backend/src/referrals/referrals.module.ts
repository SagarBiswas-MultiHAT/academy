import { Module, forwardRef } from '@nestjs/common';
import { ReferralsService } from './referrals.service';
import { ReferralsController } from './referrals.controller';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [forwardRef(() => WalletModule)],
  controllers: [ReferralsController],
  providers: [ReferralsService],
  exports: [ReferralsService], // Exported for use by OrdersModule (to update cumulative spend)
})
export class ReferralsModule {}
