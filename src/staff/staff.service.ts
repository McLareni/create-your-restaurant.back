import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';

type UploadedStaffImage = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
};

@Injectable()
export class StaffService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async createStaff(
    restaurantId: number,
    createStaffDto: CreateStaffDto,
    userId: number,
  ) {
    const restaurant = await this.prismaService.restaurant.findFirst({
      where: {
        id: restaurantId,
        ownerId: userId,
      },
      select: { id: true },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    const staff = await this.prismaService.staff.create({
      data: {
        restaurantId,
        firstName: createStaffDto.firstName,
        lastName: createStaffDto.lastName,
        email: createStaffDto.email,
        phone: createStaffDto.phone,
        role: createStaffDto.role,
        isActive: createStaffDto.isActive ?? true,
        photo: createStaffDto.photo,
      },
    });

    return {
      message: 'Staff member created successfully',
      staff,
    };
  }

  async getStaffList(restaurantId: number, userId: number) {
    const restaurant = await this.prismaService.restaurant.findFirst({
      where: {
        id: restaurantId,
        ownerId: userId,
      },
      select: { id: true },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    const staff = await this.prismaService.staff.findMany({
      where: { restaurantId },
      orderBy: { createdAt: 'asc' },
    });

    return staff;
  }

  async updateStaff(
    restaurantId: number,
    staffId: string,
    updateStaffDto: UpdateStaffDto,
    userId: number,
  ) {
    const staff = await this.prismaService.staff.findFirst({
      where: {
        id: staffId,
        restaurantId,
        restaurant: {
          ownerId: userId,
        },
      },
      select: { id: true },
    });

    if (!staff) {
      throw new NotFoundException('Staff member not found');
    }

    const { firstName, lastName, email, phone, role, isActive } =
      updateStaffDto;

    const updatedStaff = await this.prismaService.staff.update({
      where: { id: staffId },
      data: {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(role !== undefined && { role }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return {
      message: 'Staff member updated successfully',
      staff: updatedStaff,
    };
  }

  async deleteStaff(restaurantId: number, staffId: string, userId: number) {
    const staff = await this.prismaService.staff.findFirst({
      where: {
        id: staffId,
        restaurantId,
        restaurant: {
          ownerId: userId,
        },
      },
      select: { id: true },
    });

    if (!staff) {
      throw new NotFoundException('Staff member not found');
    }

    await this.prismaService.staff.delete({
      where: { id: staffId },
    });

    return {
      message: 'Staff member deleted successfully',
    };
  }

  async uploadStaffPhoto(
    restaurantId: number,
    staffId: string,
    userId: number,
    file?: UploadedStaffImage,
  ) {
    if (!file) {
      throw new BadRequestException('Photo file is required');
    }

    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Only image files are allowed');
    }

    const staff = await this.prismaService.staff.findFirst({
      where: {
        id: staffId,
        restaurantId,
        restaurant: {
          ownerId: userId,
        },
      },
      select: { id: true },
    });

    if (!staff) {
      throw new NotFoundException('Staff member not found');
    }

    const uploaded = await this.cloudinaryService.uploadImage(
      file.buffer,
      'staff',
    );

    const updatedStaff = await this.prismaService.staff.update({
      where: { id: staffId },
      data: { photo: uploaded.secure_url },
    });

    return {
      message: 'Staff photo updated successfully',
      staff: updatedStaff,
    };
  }
}
