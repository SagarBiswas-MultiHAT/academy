import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // â”€â”€ Security Headers â”€â”€
  app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
  }));

  // â”€â”€ Strict CORS â”€â”€
  const frontendUrl = configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
  app.enableCors({
    origin: [frontendUrl, 'https://academy.multihat.dev'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // â”€â”€ Global DTO Validation â”€â”€
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalInterceptors(new ResponseInterceptor());

  app.useGlobalFilters(new GlobalExceptionFilter());

  // â”€â”€ Global API Prefix â”€â”€
  app.setGlobalPrefix('api/v1');

  // â”€â”€ Swagger / OpenAPI 3.0 Documentation â”€â”€
  const swaggerConfig = new DocumentBuilder()
    .setTitle('MultiHAT Academy API')
    .setDescription('RESTful API for the MultiHAT Academy micro-credential platform')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  // â”€â”€ Start Server â”€â”€
  const port = configService.get<number>('PORT', 5000);
  await app.listen(port);
  console.log(`ðŸš€ Academy API running on http://localhost:${port}`);
  console.log(`ðŸ“„ Swagger docs at http://localhost:${port}/api/docs`);
}
bootstrap();
