import { Catch } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';
import { I18nContext } from 'nestjs-i18n';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const i18n = I18nContext.current();

    if (exception.code === 'P2002') {
      const status = 409;
      response.status(status).json({
        statusCode: status,
        message: i18n
          ? i18n.t('errors.unique_constraint_violation')
          : 'errors.unique_constraint_violation',
      });
      return;
    }

    if (exception.code === 'P2025') {
      const status = 404;
      response.status(status).json({
        statusCode: status,
        message: i18n
          ? i18n.t('errors.record_not_found')
          : 'errors.record_not_found',
      });
      return;
    }

    const status = 500;
    response.status(status).json({
      statusCode: status,
      message: i18n ? i18n.t('errors.database_error') : 'errors.database_error',
    });
  }
}
