import { Module } from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { CouponsController } from './coupons.controller';
import { CouponsPublicController } from './coupons-public.controller';

@Module({
  controllers: [CouponsController, CouponsPublicController],
  providers: [CouponsService],
})
export class CouponsModule {}
