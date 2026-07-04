import { Controller, Get } from '@nestjs/common';

@Controller('healthz')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok', uptime: process.uptime() };
  }
}
