import { Controller, Get, Post, Body, UseGuards, Query, Param, Res, StreamableFile } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaymentMethod, Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { createReadStream } from 'fs';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post()
  createOrder(
    @CurrentUser('id') userId: string,
    @Body() dto: { bookId: string; paymentMethod?: PaymentMethod; couponCode?: string },
  ) {
    return this.ordersService.createOrder(userId, dto.bookId, dto.paymentMethod, dto.couponCode);
  }

  @Get('my')
  getMyOrders(@CurrentUser('id') userId: string) {
    return this.ordersService.getMyOrders(userId);
  }

  @Get(':orderId/pdf')
  async downloadPdf(
    @CurrentUser('id') userId: string,
    @Param('orderId') orderId: string,
    @Res({ passthrough: true }) res: any,
  ) {
    const { filePath, attachmentFilename } = await this.ordersService.downloadPremiumPdf(userId, orderId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${attachmentFilename}"`,
    });
    return new StreamableFile(createReadStream(filePath));
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  getAllOrders(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.ordersService.getAllOrders(Number(page) || 1, Number(limit) || 50);
  }
}
