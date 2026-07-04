import { Controller, Get, Post, Body, UseGuards, Query, Param, Res, StreamableFile } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { createReadStream } from 'fs';
import { CreateOrderDto } from './dto/create-order.dto';
import { parsePagination } from '../common/utils/pagination';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post()
  createOrder(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateOrderDto,
  ) {
    return this.ordersService.createOrder(userId, dto.bookId, dto.paymentMethod, dto.couponCode, dto.includePrintablePdf);
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
    const pagination = parsePagination(page, limit, 50, 100);
    return this.ordersService.getAllOrders(pagination.page, pagination.limit);
  }
}
