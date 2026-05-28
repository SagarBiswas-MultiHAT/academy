import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { BooksModule } from './books/books.module';
import { CouponsModule } from './coupons/coupons.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { QuizzesModule } from './quizzes/quizzes.module';
import { CertificatesModule } from './certificates/certificates.module';
import { EmailModule } from './email/email.module';
import { WalletModule } from './wallet/wallet.module';
import { ReferralsModule } from './referrals/referrals.module';
import { ShowcasesModule } from './showcases/showcases.module';

@Module({
  imports: [
    // Load .env globally
    ConfigModule.forRoot({ isGlobal: true }),

    // Rate limiting: 100 requests per 60 seconds per IP (global default)
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),

    // Task scheduling (cron jobs for showcase verification & referral checks)
    ScheduleModule.forRoot(),

    // Core
    PrismaModule,

    // Feature modules
    AuthModule,
    UsersModule,
    BooksModule,
    CouponsModule,
    OrdersModule,
    PaymentsModule,
    QuizzesModule,
    CertificatesModule,
    EmailModule,

    // Wallet ecosystem modules
    WalletModule,
    ReferralsModule,
    ShowcasesModule,
  ],
  providers: [
    // Apply throttler globally
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}

