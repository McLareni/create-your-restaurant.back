import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
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
  ],
})
export class StaffModule {}
