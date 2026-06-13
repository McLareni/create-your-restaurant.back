import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { hash } from 'bcrypt';
import { EnumRole } from '@prisma/client';
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

  private mapToUiStaff(user: any) {
    return {
      id: String(user.id),
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.customRole || user.role,
      isActive: user.isActive,
      photo: user.photo,
      pinCode: user.pinCode,
    };
  }

  async getAvailablePermissions(restaurantId: number, userId: number) {
    const restaurant = await this.prismaService.restaurant.findFirst({
      where: { id: restaurantId, ownerId: userId },
      select: { activeModules: true },
    });
    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    const allPermissions = [
      {
        id: 'analytics',
        label: 'Перегляд аналітики та звітів',
        module: 'analytics',
      },
      {
        id: 'menu',
        label: 'Управління цифровим меню й цінами',
        module: 'menu-engine',
      },
      {
        id: 'tables',
        label: 'Керування QR-кодами закладу',
        module: 'qr-tables',
      },
      {
        id: 'orders',
        label: 'Скасування та модифікація чеків',
        module: 'staff',
      },
      {
        id: 'staff',
        label: 'Управління змінами працівників',
        module: 'staff',
      },
    ];
    return allPermissions
      .filter((perm) => restaurant.activeModules.includes(perm.module))
      .map(({ id, label }) => ({ id, label }));
  }

  async createStaffRole(
    restaurantId: number,
    createStaffRoleDto: CreateStaffRoleDto,
    userId: number,
  ) {
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
        restaurantId_name: {
          restaurantId,
          name: roleName,
        },
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

    const isRoleUsed = await this.prismaService.user.findFirst({
      where: { restaurantId, customRole: role.name },
    });
    if (isRoleUsed) {
      throw new BadRequestException(
        'Cannot delete role because it is assigned to staff members',
      );
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
      where: { id: restaurantId, ownerId: userId },
      select: { id: true },
    });
    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    const roleExists = await this.prismaService.staffRole.findFirst({
      where: { restaurantId, name: createStaffDto.role },
    });
    if (!roleExists) {
      throw new BadRequestException(
        'The assigned role does not exist in this restaurant',
      );
    }

    const existingUser = await this.prismaService.user.findFirst({
      where: {
        email: createStaffDto.email,
        restaurantId,
      },
    });
    if (existingUser) {
      throw new BadRequestException(
        'User with this email already exists in this restaurant',
      );
    }

    const passwordHash = createStaffDto.password
      ? await hash(createStaffDto.password, 10)
      : null;
    const newUser = await this.prismaService.user.create({
      data: {
        restaurantId,
        email: createStaffDto.email,
        firstName: createStaffDto.firstName,
        lastName: createStaffDto.lastName,
        phone: createStaffDto.phone,
        role: EnumRole.STAFF,
        customRole: createStaffDto.role,
        isActive: createStaffDto.isActive ?? true,
        photo: createStaffDto.photo,
        pinCode: passwordHash,
      },
    });
    return {
      message: 'Staff member created successfully',
      staff: this.mapToUiStaff(newUser),
    };
  }

  async getStaffList(restaurantId: number, userId: number) {
    const restaurant = await this.prismaService.restaurant.findFirst({
      where: { id: restaurantId, ownerId: userId },
      select: { id: true },
    });
    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    const users = await this.prismaService.user.findMany({
      where: { restaurantId },
      orderBy: { createdAt: 'asc' },
    });
    return users.map((user) => this.mapToUiStaff(user));
  }

  async updateStaff(
    restaurantId: number,
    staffId: string,
    updateStaffDto: UpdateStaffDto,
    userId: number,
  ) {
    const numericId = Number(staffId);
    if (Number.isNaN(numericId)) {
      throw new BadRequestException('Invalid staff ID format');
    }

    const staff = await this.prismaService.user.findFirst({
      where: {
        id: numericId,
        restaurantId,
        staffRestaurant: { is: { ownerId: userId } },
      },
    });
    if (!staff) {
      throw new NotFoundException('Staff member not found');
    }

    const { firstName, lastName, email, phone, role, isActive, password } =
      updateStaffDto;
    if (email !== undefined && email !== staff.email) {
      const emailTaken = await this.prismaService.user.findFirst({
        where: {
          email,
          restaurantId,
        },
      });
      if (emailTaken) {
        throw new BadRequestException(
          'User with this email already exists in this restaurant',
        );
      }
    }

    if (role !== undefined) {
      const roleExists = await this.prismaService.staffRole.findFirst({
        where: { restaurantId, name: role },
      });
      if (!roleExists) {
        throw new BadRequestException(
          'The assigned role does not exist in this restaurant',
        );
      }
    }

    const passwordHash = password ? await hash(password, 10) : undefined;
    const updatedUser = await this.prismaService.user.update({
      where: { id: numericId },
      data: {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(role !== undefined && { role: EnumRole.STAFF }),
        ...(role !== undefined && { customRole: role }),
        ...(isActive !== undefined && { isActive }),
        ...(passwordHash !== undefined && { pinCode: passwordHash }),
      },
    });
    return {
      message: 'Staff member updated successfully',
      staff: this.mapToUiStaff(updatedUser),
    };
  }

  async deleteStaff(restaurantId: number, staffId: string, userId: number) {
    const numericId = Number(staffId);
    if (Number.isNaN(numericId)) {
      throw new BadRequestException('Invalid staff ID format');
    }

    const staff = await this.prismaService.user.findFirst({
      where: {
        id: numericId,
        restaurantId,
        staffRestaurant: { is: { ownerId: userId } },
      },
    });
    if (!staff) {
      throw new NotFoundException('Staff member not found');
    }

    await this.prismaService.user.delete({ where: { id: numericId } });
    return { message: 'Staff member deleted successfully' };
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

    const numericId = Number(staffId);
    if (Number.isNaN(numericId)) {
      throw new BadRequestException('Invalid staff ID format');
    }

    const staff = await this.prismaService.user.findFirst({
      where: {
        id: numericId,
        restaurantId,
        staffRestaurant: { is: { ownerId: userId } },
      },
    });
    if (!staff) {
      throw new NotFoundException('Staff member not found');
    }

    const uploaded = await this.cloudinaryService.uploadImage(
      file.buffer,
      'staff',
    );
    const updatedUser = await this.prismaService.user.update({
      where: { id: numericId },
      data: { photo: uploaded.secure_url },
    });
    return {
      message: 'Staff photo updated successfully',
      staff: this.mapToUiStaff(updatedUser),
    };
  }
}
