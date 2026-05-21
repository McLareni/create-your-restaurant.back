import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';

@Injectable()
export class StaffService {
  constructor(private readonly prismaService: PrismaService) {}

  async createStaff(restaurantId: number, createStaffDto: CreateStaffDto, userId: number) {
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
        role: createStaffDto.role as any,
        isActive: createStaffDto.isActive ?? true,
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

  async updateStaff(restaurantId: number, staffId: string, updateStaffDto: UpdateStaffDto, userId: number) {
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

    const updatedStaff = await this.prismaService.staff.update({
      where: { id: staffId },
      data: updateStaffDto as any,
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
}