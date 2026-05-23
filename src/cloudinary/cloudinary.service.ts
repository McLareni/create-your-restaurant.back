import {
  BadGatewayException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  v2 as cloudinary,
  type UploadApiResponse,
  type UploadApiErrorResponse,
} from 'cloudinary';
import { Readable } from 'node:stream';

@Injectable()
export class CloudinaryService {
  constructor(private readonly configService: ConfigService) {}

  async uploadImage(fileBuffer: Buffer, folder: string) {
    const cloudName = this.configService
      .get<string>('CLOUDINARY_CLOUD_NAME')
      ?.trim();
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY')?.trim();
    const apiSecret = this.configService
      .get<string>('CLOUDINARY_API_SECRET')
      ?.trim();

    if (!cloudName || !apiKey || !apiSecret) {
      throw new InternalServerErrorException('Cloudinary is not configured');
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });

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
            reject(new BadGatewayException('Failed to upload image'));
            return;
          }

          resolve(result);
        },
      );

      Readable.from(fileBuffer).pipe(uploadStream);
    });
  }
}
