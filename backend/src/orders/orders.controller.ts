import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaymentMethod } from '@prisma/client';

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
}
