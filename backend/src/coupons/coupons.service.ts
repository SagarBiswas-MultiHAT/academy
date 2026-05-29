import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CouponsService {
  constructor(private prisma: PrismaService) {}

  create(createCouponDto: CreateCouponDto) {
    return this.prisma.coupon.create({
      data: {
        code: createCouponDto.code,
        discountType: createCouponDto.discountType,
        discountValue: createCouponDto.discountValue,
        validFrom: new Date(createCouponDto.validFrom),
        validUntil: new Date(createCouponDto.validUntil),
        usageLimit: createCouponDto.usageLimit,
        isActive: createCouponDto.isActive ?? true,
        includesPdf: createCouponDto.includesPdf ?? false,
      },
    });
  }

  findAll() {
    return this.prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw new NotFoundException('Coupon not found');
    return coupon;
  }

  update(id: string, updateCouponDto: UpdateCouponDto) {
    return this.prisma.coupon.update({
      where: { id },
      data: {
        ...(updateCouponDto.code && { code: updateCouponDto.code }),
        ...(updateCouponDto.discountType && { discountType: updateCouponDto.discountType }),
        ...(updateCouponDto.discountValue !== undefined && { discountValue: updateCouponDto.discountValue }),
        ...(updateCouponDto.validFrom && { validFrom: new Date(updateCouponDto.validFrom) }),
        ...(updateCouponDto.validUntil && { validUntil: new Date(updateCouponDto.validUntil) }),
        ...(updateCouponDto.usageLimit !== undefined && { usageLimit: updateCouponDto.usageLimit }),
        ...(updateCouponDto.isActive !== undefined && { isActive: updateCouponDto.isActive }),
        ...(updateCouponDto.includesPdf !== undefined && { includesPdf: updateCouponDto.includesPdf }),
      },
    });
  }

  remove(id: string) {
    return this.prisma.coupon.delete({ where: { id } });
  }
}
