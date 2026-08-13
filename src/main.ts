import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import compression from 'compression';
import * as express from 'express';
import {
  i18nValidationErrorFactory,
  I18nValidationExceptionFilter,
} from 'nestjs-i18n';
import { AppModule } from 'src/app.module';
import { setupSwagger } from 'src/swagger';
import { getAllowedCorsOrigins } from 'src/common/cors';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.set('trust proxy', 1);

  app.enableCors({
    origin: getAllowedCorsOrigins(),
    credentials: true,
  });

  app.use(helmet());
  app.use(compression());

  app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));

  app.use(cookieParser());
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ limit: '5mb', extended: true }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: i18nValidationErrorFactory,
    }),
  );

  app.useGlobalFilters(
    new I18nValidationExceptionFilter({ detailedErrors: false }),
  );

  if (process.env.NODE_ENV !== 'production') {
    setupSwagger(app);
  }

  await app.listen(process.env.PORT ?? 3001, '0.0.0.0');
}
void bootstrap();
