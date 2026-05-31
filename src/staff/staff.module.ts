import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SessionAuthMiddleware } from '../restaurants/middleware/session-auth.middleware';
import { UsersModule } from '../users/users.module';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';

@Module({
  imports: [UsersModule],
  controllers: [StaffController],
  providers: [
    StaffService,
    CloudinaryService,
    PrismaService,
    SessionAuthMiddleware,
  ],
})
export class StaffModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SessionAuthMiddleware).forRoutes(StaffController);
  }
}