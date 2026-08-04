import { Module } from '@nestjs/common';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { CloudinaryCleanupService } from 'src/cloudinary/cloudinary-cleanup.service';

@Module({
  providers: [CloudinaryService, CloudinaryCleanupService],
  exports: [CloudinaryService, CloudinaryCleanupService],
})
export class CloudinaryModule {}
