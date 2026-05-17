import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Create Your Restaurant API')
    .setDescription('API documentation for Create Your Restaurant service')
    .setVersion('1.0')
    .addCookieAuth(
      'gustio_session',
      {
        type: 'apiKey',
        in: 'cookie',
        name: 'gustio_session',
        description: 'Session token from cookie',
      },
      'gustio_session',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
}
