import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateModifierGroupDto } from './dto/create-modifier.dto';
import { UpdateModifierGroupDto } from './dto/update-modifier.dto';

@Injectable()
export class ModifiersService {
  constructor(private readonly prismaService: PrismaService) {}

  async createGroup(
    restaurantId: number,
    createModifierGroupDto: CreateModifierGroupDto,
    userId: number,
  ) {
    const restaurant = await this.prismaService.restaurant.findFirst({
      where: { id: restaurantId, ownerId: userId },
      select: { id: true },
    });

    if (!restaurant) throw new NotFoundException('Restaurant not found');

    const group = await this.prismaService.modifierGroup.create({
      data: {
        restaurantId,
        name: createModifierGroupDto.name,
        isRequired: createModifierGroupDto.isRequired ?? false,
        minSelections: createModifierGroupDto.minSelections ?? 0,
        maxSelections: createModifierGroupDto.maxSelections,
        options: {
          create: createModifierGroupDto.options.map((opt) => ({
            name: opt.name,
            price: opt.price ?? 0,
            isAvailable: opt.isAvailable ?? true,
          })),
        },
      },
      include: { options: true },
    });

    return { message: 'Modifier group created successfully', group };
  }

  async getGroups(restaurantId: number, userId: number) {
    const restaurant = await this.prismaService.restaurant.findFirst({
      where: { id: restaurantId, ownerId: userId },
      select: { id: true },
    });

    if (!restaurant) throw new NotFoundException('Restaurant not found');

    return this.prismaService.modifierGroup.findMany({
      where: { restaurantId },
      include: { options: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateGroup(
    restaurantId: number,
    groupId: string,
    updateDto: UpdateModifierGroupDto,
    userId: number,
  ) {
    const group = await this.prismaService.modifierGroup.findFirst({
      where: { id: groupId, restaurantId, restaurant: { ownerId: userId } },
      select: { id: true },
    });

    if (!group) throw new NotFoundException('Modifier group not found');

    const { options, ...groupData } = updateDto;

    const updatedGroup = await this.prismaService.$transaction(async (tx) => {
      const g = await tx.modifierGroup.update({
        where: { id: groupId },
        data: groupData,
      });

      if (options) {
        await tx.modifierOption.deleteMany({
          where: { modifierGroupId: groupId },
        });
        await tx.modifierOption.createMany({
          data: options.map((opt) => ({
            modifierGroupId: groupId,
            name: opt.name,
            price: opt.price ?? 0,
            isAvailable: opt.isAvailable ?? true,
          })),
        });
      }

      return tx.modifierGroup.findUnique({
        where: { id: groupId },
        include: { options: true },
      });
    });

    return {
      message: 'Modifier group updated successfully',
      group: updatedGroup,
    };
  }

  async deleteGroup(restaurantId: number, groupId: string, userId: number) {
    const group = await this.prismaService.modifierGroup.findFirst({
      where: { id: groupId, restaurantId, restaurant: { ownerId: userId } },
      select: { id: true },
    });

    if (!group) throw new NotFoundException('Modifier group not found');

    await this.prismaService.modifierGroup.delete({ where: { id: groupId } });

    return { message: 'Modifier group deleted successfully' };
  }

  async attachToDish(
    restaurantId: number,
    dishId: string,
    modifierGroupId: string,
    userId: number,
  ) {
    const dish = await this.prismaService.dish.findFirst({
      where: {
        id: dishId,
        category: { restaurantId, restaurant: { ownerId: userId } },
      },
      select: { id: true },
    });

    if (!dish) throw new NotFoundException('Dish not found');

    await this.prismaService.dishModifier.create({
      data: { dishId, modifierGroupId },
    });

    return { message: 'Modifier attached to dish successfully' };
  }

  async detachFromDish(
    restaurantId: number,
    dishId: string,
    modifierGroupId: string,
    userId: number,
  ) {
    const dish = await this.prismaService.dish.findFirst({
      where: {
        id: dishId,
        category: { restaurantId, restaurant: { ownerId: userId } },
      },
      select: { id: true },
    });

    if (!dish) throw new NotFoundException('Dish not found');

    await this.prismaService.dishModifier.delete({
      where: { dishId_modifierGroupId: { dishId, modifierGroupId } },
    });

    return { message: 'Modifier detached from dish successfully' };
  }
}
