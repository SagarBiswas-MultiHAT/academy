import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TopUpWalletDto } from './dto/topup-wallet.dto';
import { ConfirmTopUpDto } from './dto/confirm-topup.dto';
import { parsePagination } from '../common/utils/pagination';

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
  initiateTopUp(@CurrentUser('id') userId: string, @Body() dto: TopUpWalletDto) {
    return this.walletService.initiateTopUp(userId, dto.amountBdt);
  }

  @Post('topup/confirm')
  confirmTopUp(@CurrentUser('id') userId: string, @Body() dto: ConfirmTopUpDto) {
    return this.walletService.confirmTopUp(userId, dto.tranId);
  }

  @Get('transactions')
  getTransactions(
    @CurrentUser('id') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pagination = parsePagination(page, limit, 20, 100);
    return this.walletService.getTransactions(userId, pagination.page, pagination.limit);
  }
}
