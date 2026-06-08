import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CouponsService } from './coupons.service';

@ApiTags('Coupons')
@Controller('coupons')
export class CouponsPublicController {
  constructor(private readonly couponsService: CouponsService) {}

  @Get('verify/:code')
  verifyCoupon(@Param('code') code: string) {
    return this.couponsService.verifyCoupon(code);
  }
}
