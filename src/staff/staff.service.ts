import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { hash } from 'bcrypt';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { CreateStaffRoleDto } from './dto/create-staff-role.dto';

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

  async createStaffRole(restaurantId: number, createStaffRoleDto: CreateStaffRoleDto, userId: number) {
    const restaurant = await this.prismaService.restaurant.findFirst({
      where: { id: restaurantId, ownerId: userId },
      select: { id: true },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    const roleName = createStaffRoleDto.name.trim();

    const existingRole = await this.prismaService.staffRole.findUnique({
      where: {
        restaurantId_name: { restaurantId, name: roleName },
      },
    });

    if (existingRole) {
      throw new BadRequestException('Role already exists in this restaurant');
    }

    return this.prismaService.staffRole.create({
      data: {
        restaurantId,
        name: roleName,
      },
    });
  }

  async getStaffRoles(restaurantId: number, userId: number) {
    const restaurant = await this.prismaService.restaurant.findFirst({
      where: { id: restaurantId, ownerId: userId },
      select: { id: true },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    return this.prismaService.staffRole.findMany({
      where: { restaurantId },
      orderBy: { name: 'asc' },
    });
  }

  async deleteStaffRole(restaurantId: number, roleId: string, userId: number) {
    const role = await this.prismaService.staffRole.findFirst({
      where: {
        id: roleId,
        restaurantId,
        restaurant: { ownerId: userId },
      },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const isRoleUsed = await this.prismaService.staff.findFirst({
      where: { restaurantId, role: role.name },
    });

    if (isRoleUsed) {
      throw new BadRequestException('Cannot delete role because it is assigned to staff members');
    }

    await this.prismaService.staffRole.delete({
      where: { id: roleId },
    });

    return { message: 'Role deleted successfully' };
  }

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

    const roleExists = await this.prismaService.staffRole.findFirst({
      where: { restaurantId, name: createStaffDto.role },
    });

    if (!roleExists) {
      throw new BadRequestException('The assigned role does not exist in this restaurant');
    }

    const passwordHash = createStaffDto.password ? await hash(createStaffDto.password, 10) : null;

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
        password: passwordHash,
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

    return this.prismaService.staff.findMany({
      where: { restaurantId },
      orderBy: { createdAt: 'asc' },
    });
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

    const { firstName, lastName, email, phone, role, isActive, password } =
      updateStaffDto;

    if (role !== undefined) {
      const roleExists = await this.prismaService.staffRole.findFirst({
        where: { restaurantId, name: role },
      });
      if (!roleExists) {
        throw new BadRequestException('The assigned role does not exist in this restaurant');
      }
    }

    const passwordHash = password ? await hash(password, 10) : undefined;

    const updatedStaff = await this.prismaService.staff.update({
      where: { id: staffId },
      data: {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(role !== undefined && { role }),
        ...(isActive !== undefined && { isActive }),
        ...(passwordHash !== undefined && { password: passwordHash }),
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