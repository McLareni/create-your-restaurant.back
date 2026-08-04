import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SessionAuthMiddleware } from 'src/restaurants/middleware/session-auth.middleware';
import { UsersModule } from 'src/users/users.module';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { StaffController } from 'src/staff/staff.controller';
import { StaffService } from 'src/staff/staff.service';
import { StaffOperationsController } from 'src/staff/staff-operations.controller';
import { StaffOperationsService } from 'src/staff/staff-operations.service';

@Module({
  imports: [UsersModule],
  controllers: [StaffController, StaffOperationsController],
  providers: [
    StaffService,
    StaffOperationsService,
    CloudinaryService,
    PrismaService,
    SessionAuthMiddleware,
  ],
})
export class StaffModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(SessionAuthMiddleware)
      .forRoutes(StaffController, StaffOperationsController);
  }
}
