import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PaymentsModule } from '../payments/payments.module';
import { WalletModule } from '../wallet/wallet.module';
import { ReferralsModule } from '../referrals/referrals.module';

@Module({
  imports: [PaymentsModule, WalletModule, ReferralsModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
