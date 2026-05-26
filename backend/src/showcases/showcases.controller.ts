import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ShowcasesService } from './showcases.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ShowcasePlatform } from '@prisma/client';

@ApiTags('Showcases')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('showcases')
export class ShowcasesController {
  constructor(private showcasesService: ShowcasesService) {}

  @Post('submit')
  submitShowcase(
    @CurrentUser('id') userId: string,
    @Body() dto: { certificateId: string; platform: ShowcasePlatform; postUrl: string },
  ) {
    return this.showcasesService.submitShowcase(userId, dto.certificateId, dto.platform, dto.postUrl);
  }

  @Get('my')
  getMyShowcases(@CurrentUser('id') userId: string) {
    return this.showcasesService.getMyShowcases(userId);
  }
}
