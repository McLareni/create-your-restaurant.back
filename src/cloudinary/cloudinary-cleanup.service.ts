import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Injectable()
export class CloudinaryCleanupService {
  private readonly logger = new Logger(CloudinaryCleanupService.name);
  private readonly pendingDeletions: Set<string> = new Set();

  constructor(private readonly cloudinaryService: CloudinaryService) {}

  scheduleDeletion(publicId: string) {
    this.pendingDeletions.add(publicId);
  }

  cancelDeletion(publicId: string) {
    this.pendingDeletions.delete(publicId);
  }

  @Cron(CronExpression.EVERY_HOUR)
  async processPendingDeletions() {
    if (this.pendingDeletions.size === 0) {
      return;
    }

    const idsToDelete = Array.from(this.pendingDeletions);
    this.pendingDeletions.clear();

    for (const publicId of idsToDelete) {
      try {
        await this.cloudinaryService.deleteImage(publicId);
      } catch {
        this.logger.error(
          `errors.cloudinary_background_deletion_failed: ${publicId}`,
        );
        this.pendingDeletions.add(publicId);
      }
    }
  }
}
