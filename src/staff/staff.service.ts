import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { hash } from 'bcrypt';
import { EnumRole } from '@prisma/client';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { PrismaService } from 'src/prisma/prisma.service';
import type { CreateStaffDto } from 'src/staff/dto/create-staff.dto';
import type { UpdateStaffDto } from 'src/staff/dto/update-staff.dto';
import type { CreateStaffRoleDto } from 'src/staff/dto/create-staff-role.dto';
import { DataMappingUtil } from 'src/common/utils/mapping.util';
import type { UploadedStaffImage } from 'src/cloudinary/cloudinary.service';
import { PERMISSION_REGISTRY } from 'src/common/constants/permissions.constants';

const CORE_MODULES = ['orders'];

@Injectable()
export class StaffService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async getAvailablePermissions(restaurantId: number, userId: number) {
    const restaurant = await this.prismaService.restaurant.findFirst({
      where: {
        id: restaurantId,
        OR: [{ ownerId: userId }, { staff: { some: { id: userId } } }],
      },
      select: { activeModules: true },
    });

    if (!restaurant) {
      throw new NotFoundException('errors.restaurant_not_found');
    }

    const activeSet = new Set([...restaurant.activeModules, ...CORE_MODULES]);

    return PERMISSION_REGISTRY.filter((group) =>
      activeSet.has(group.moduleKey),
    );
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
      throw new NotFoundException('errors.access_denied');
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
      throw new BadRequestException('errors.role_exists');
    }

    return this.prismaService.staffRole.create({
      data: {
        restaurantId,
        name: roleName,
        permissions: createStaffRoleDto.permissions || [],
      },
    });
  }

  async updateStaffRole(
    restaurantId: number,
    roleId: string,
    permissions: string[],
    userId: number,
  ) {
    const role = await this.prismaService.staffRole.findFirst({
      where: {
        id: roleId,
        restaurantId,
        restaurant: { ownerId: userId },
      },
    });
    if (!role) {
      throw new NotFoundException('errors.access_denied');
    }

    return this.prismaService.staffRole.update({
      where: { id: roleId },
      data: { permissions },
    });
  }

  async getStaffRoles(restaurantId: number, userId: number) {
    const restaurant = await this.prismaService.restaurant.findFirst({
      where: {
        id: restaurantId,
        OR: [{ ownerId: userId }, { staff: { some: { id: userId } } }],
      },
      select: { id: true },
    });
    if (!restaurant) {
      throw new NotFoundException('errors.restaurant_not_found');
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
      throw new NotFoundException('errors.access_denied');
    }

    return this.prismaService.$transaction(async (tx) => {
      await tx.user.updateMany({
        where: {
          restaurantId,
          customRole: role.name,
        },
        data: {
          customRole: null,
          role: EnumRole.STAFF,
        },
      });

      await tx.staffRole.delete({
        where: { id: roleId },
      });

      return { message: 'success.role_deleted' };
    });
  }

  async createStaff(
    restaurantId: number,
    createStaffDto: CreateStaffDto,
    userId: number,
  ) {
    const restaurant = await this.prismaService.restaurant.findFirst({
      where: {
        id: restaurantId,
        OR: [{ ownerId: userId }, { staff: { some: { id: userId } } }],
      },
      select: { id: true },
    });
    if (!restaurant) {
      throw new NotFoundException('errors.restaurant_not_found');
    }

    if (createStaffDto.role !== 'STAFF') {
      const roleExists = await this.prismaService.staffRole.findFirst({
        where: { restaurantId, name: createStaffDto.role },
      });
      if (!roleExists) {
        throw new BadRequestException('errors.role_not_found');
      }
    }

    const existingUser = await this.prismaService.user.findFirst({
      where: {
        email: createStaffDto.email,
        restaurantId,
      },
    });
    if (existingUser) {
      throw new BadRequestException('errors.email_exists');
    }

    const passwordHash = createStaffDto.password
      ? await hash(createStaffDto.password, 12)
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
      message: 'success.staff_created',
      staff: DataMappingUtil.mapToUiStaff(newUser),
    };
  }

  async getStaffList(restaurantId: number, userId: number) {
    const restaurant = await this.prismaService.restaurant.findFirst({
      where: {
        id: restaurantId,
        OR: [{ ownerId: userId }, { staff: { some: { id: userId } } }],
      },
      select: { id: true },
    });
    if (!restaurant) {
      throw new NotFoundException('errors.restaurant_not_found');
    }

    const users = await this.prismaService.user.findMany({
      where: { restaurantId },
      orderBy: { createdAt: 'asc' },
    });

    return users.map((user) => DataMappingUtil.mapToUiStaff(user));
  }

  async updateStaff(
    restaurantId: number,
    staffId: string,
    updateStaffDto: UpdateStaffDto,
    userId: number,
  ) {
    const numericId = Number(staffId);
    if (Number.isNaN(numericId)) {
      throw new BadRequestException('errors.invalid_id');
    }

    const staff = await this.prismaService.user.findFirst({
      where: {
        id: numericId,
        restaurantId,
        staffRestaurant: {
          OR: [{ ownerId: userId }, { staff: { some: { id: userId } } }],
        },
      },
    });
    if (!staff) {
      throw new NotFoundException('errors.user_not_found');
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
        throw new BadRequestException('errors.email_exists');
      }
    }

    if (role !== undefined && role !== 'STAFF') {
      const roleExists = await this.prismaService.staffRole.findFirst({
        where: { restaurantId, name: role },
      });
      if (!roleExists) {
        throw new BadRequestException('errors.role_not_found');
      }
    }

    const passwordHash = password ? await hash(password, 12) : undefined;

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
      message: 'success.staff_updated',
      staff: DataMappingUtil.mapToUiStaff(updatedUser),
    };
  }

  async deleteStaff(restaurantId: number, staffId: string, userId: number) {
    const numericId = Number(staffId);
    if (Number.isNaN(numericId)) {
      throw new BadRequestException('errors.invalid_id');
    }

    const staff = await this.prismaService.user.findFirst({
      where: {
        id: numericId,
        restaurantId,
        staffRestaurant: {
          OR: [{ ownerId: userId }, { staff: { some: { id: userId } } }],
        },
      },
    });
    if (!staff) {
      throw new NotFoundException('errors.user_not_found');
    }

    await this.prismaService.user.delete({ where: { id: numericId } });
    return { message: 'success.staff_deleted' };
  }

  async uploadStaffPhoto(
    restaurantId: number,
    staffId: string,
    userId: number,
    file?: UploadedStaffImage,
  ) {
    if (!file) {
      throw new BadRequestException('errors.photo_required');
    }
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('errors.invalid_file_type');
    }

    const numericId = Number(staffId);
    if (Number.isNaN(numericId)) {
      throw new BadRequestException('errors.invalid_id');
    }

    const staff = await this.prismaService.user.findFirst({
      where: {
        id: numericId,
        restaurantId,
        staffRestaurant: {
          OR: [{ ownerId: userId }, { staff: { some: { id: userId } } }],
        },
      },
    });
    if (!staff) {
      throw new NotFoundException('errors.user_not_found');
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
      message: 'success.photo_uploaded',
      staff: DataMappingUtil.mapToUiStaff(updatedUser),
    };
  }
}
