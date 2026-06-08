import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.connectWithRetry();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  private async connectWithRetry(maxAttempts = 5, delayMs = 1000) {
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this.$connect();
        return;
      } catch (error) {
        lastError = error;

        if (attempt < maxAttempts) {
          this.logger.warn(
            `Prisma connect failed (attempt ${attempt}/${maxAttempts}). Retrying in ${delayMs}ms.`,
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }

    const message =
      lastError instanceof Error ? lastError.message : String(lastError);
    throw new Error(
      `Unable to connect to PostgreSQL after ${maxAttempts} attempts. Check that the database is running and DATABASE_URL is correct. Original error: ${message}`,
    );
  }
}
