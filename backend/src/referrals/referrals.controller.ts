import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ReferralsService } from './referrals.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Referrals')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('referrals')
export class ReferralsController {
  constructor(private referralsService: ReferralsService) {}

  @Get('code')
  getReferralCode(@CurrentUser('id') userId: string) {
    return this.referralsService.getReferralCode(userId);
  }

  @Get('stats')
  getReferralStats(@CurrentUser('id') userId: string) {
    return this.referralsService.getReferralStats(userId);
  }
}
