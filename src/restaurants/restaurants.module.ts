import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RestaurantsController } from 'src/restaurants/restaurants.controller';
import { RestaurantsService } from 'src/restaurants/restaurants.service';
import { UsersModule } from 'src/users/users.module';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Module({
  imports: [UsersModule],
  controllers: [RestaurantsController],
  providers: [RestaurantsService, PrismaService, CloudinaryService],
})
export class RestaurantsModule {}
