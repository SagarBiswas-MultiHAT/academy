import { Module } from '@nestjs/common';
import { ShowcasesService } from './showcases.service';
import { ShowcasesController } from './showcases.controller';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [WalletModule],
  controllers: [ShowcasesController],
  providers: [ShowcasesService],
})
export class ShowcasesModule {}
