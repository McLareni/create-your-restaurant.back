import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Injectable()
export class CloudinaryCleanupService {
  private readonly logger = new Logger(CloudinaryCleanupService.name);
  private readonly pendingDeletions = new Map<string, number>();

  constructor(private readonly cloudinaryService: CloudinaryService) {}

  scheduleDeletion(publicId: string) {
    this.pendingDeletions.set(publicId, 0);
  }

  cancelDeletion(publicId: string) {
    this.pendingDeletions.delete(publicId);
  }

  @Cron(CronExpression.EVERY_HOUR)
  async processPendingDeletions() {
    if (this.pendingDeletions.size === 0) {
      return;
    }

    const entries = Array.from(this.pendingDeletions.entries());
    this.pendingDeletions.clear();

    for (const [publicId, attempts] of entries) {
      try {
        await this.cloudinaryService.deleteImage(publicId);
      } catch {
        this.logger.error(`errors.cloudinary_deletion_failed: ${publicId}`);
        if (attempts < 3) {
          this.pendingDeletions.set(publicId, attempts + 1);
        }
      }
    }
  }
}
