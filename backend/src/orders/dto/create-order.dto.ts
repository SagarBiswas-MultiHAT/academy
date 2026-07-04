import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class CreateOrderDto {
  @IsUUID()
  bookId: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  couponCode?: string;

  @IsOptional()
  @IsBoolean()
  includePrintablePdf?: boolean;
}
