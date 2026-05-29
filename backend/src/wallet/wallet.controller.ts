import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Wallet')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('wallet')
export class WalletController {
  constructor(private walletService: WalletService) {}

  @Get('balance')
  getBalance(@CurrentUser('id') userId: string) {
    return this.walletService.getBalance(userId);
  }

  @Post('topup')
  initiateTopUp(@CurrentUser('id') userId: string, @Body('amountBdt') amountBdt: number) {
    return this.walletService.initiateTopUp(userId, amountBdt);
  }

  @Post('topup/confirm')
  confirmTopUp(@CurrentUser('id') userId: string, @Body('tranId') tranId: string) {
    return this.walletService.confirmTopUp(userId, tranId);
  }

  @Get('transactions')
  getTransactions(
    @CurrentUser('id') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.walletService.getTransactions(userId, Number(page) || 1, Number(limit) || 20);
  }
}
