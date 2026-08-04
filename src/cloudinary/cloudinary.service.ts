import {
  BadGatewayException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import type { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import type { UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import { Readable } from 'node:stream';

export type UploadedStaffImage = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
};

@Injectable()
export class CloudinaryService implements OnModuleInit {
  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const cloudinaryUrl = this.configService
      .get<string>('CLOUDINARY_URL')
      ?.trim();
    const cloudName = this.configService
      .get<string>('CLOUDINARY_CLOUD_NAME')
      ?.trim();
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY')?.trim();
    const apiSecret = this.configService
      .get<string>('CLOUDINARY_API_SECRET')
      ?.trim();

    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
      });
    } else if (cloudinaryUrl) {
      cloudinary.config(cloudinaryUrl);
    } else {
      throw new InternalServerErrorException(
        'errors.cloudinary_not_configured',
      );
    }
  }

  async uploadImage(fileBuffer: Buffer, folder: string) {
    return new Promise<UploadApiResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
        },
        (
          error: UploadApiErrorResponse | undefined,
          result: UploadApiResponse | undefined,
        ) => {
          if (error || !result) {
            reject(new BadGatewayException('errors.cloudinary_upload_failed'));
            return;
          }
          resolve(result);
        },
      );

      Readable.from(fileBuffer).pipe(uploadStream);
    });
  }

  async deleteImage(publicId: string) {
    try {
      return await cloudinary.uploader.destroy(publicId);
    } catch {
      throw new BadGatewayException('errors.cloudinary_delete_failed');
    }
  }
}
