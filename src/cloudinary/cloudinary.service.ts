import {
  BadGatewayException,
  Injectable,
  InternalServerErrorException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  v2 as cloudinary,
  type UploadApiResponse,
  type UploadApiErrorResponse,
} from 'cloudinary';
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
      throw new InternalServerErrorException('Cloudinary is not configured');
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
            const detail =
              error?.message ||
              error?.http_code?.toString() ||
              'unknown Cloudinary error';
            reject(
              new BadGatewayException(`Failed to upload image: ${detail}`),
            );
            return;
          }

          resolve(result);
        },
      );

      Readable.from(fileBuffer).pipe(uploadStream);
    });
  }
}
