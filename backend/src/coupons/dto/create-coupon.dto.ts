import { IsBoolean, IsDateString, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { DiscountType } from '@prisma/client';

export class CreateCouponDto {
	@IsString()
	@IsNotEmpty()
	code: string;

	@IsEnum(DiscountType)
	discountType: DiscountType;

	@IsNumber()
	@Min(0)
	discountValue: number;

	@IsDateString()
	validFrom: string;

	@IsDateString()
	validUntil: string;

	@IsInt()
	@Min(1)
	usageLimit: number;

	@IsOptional()
	@IsBoolean()
	isActive?: boolean;
}
