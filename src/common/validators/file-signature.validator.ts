import { FileValidator, BadRequestException } from '@nestjs/common';
import type { UploadedStaffImage } from 'src/cloudinary/cloudinary.service';

export class FileSignatureValidator extends FileValidator {
  constructor() {
    super({});
  }

  isValid(fileOrFiles?: UploadedStaffImage | UploadedStaffImage[]): boolean {
    if (!fileOrFiles) return true;

    const files = Array.isArray(fileOrFiles) ? fileOrFiles : [fileOrFiles];
    if (files.length === 0) return true;

    for (const file of files) {
      if (!file || !file.buffer) return false;
      const buffer = file.buffer;
      if (buffer.length < 12) return false;

      const hex4 = buffer.toString('hex', 0, 4).toUpperCase();
      const isPng = hex4 === '89504E47';
      const isJpeg = hex4.startsWith('FFD8FF');

      const isRiff = hex4 === '52494646';
      const webpHeader = buffer.toString('hex', 8, 12).toUpperCase();
      const isWebp = isRiff && webpHeader === '57454250';

      if (!isPng && !isJpeg && !isWebp) {
        throw new BadRequestException('errors.invalid_file_signature');
      }
    }
    return true;
  }

  buildErrorMessage(): string {
    return 'errors.invalid_file_signature';
  }
}
