import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import type { CreateModifierGroupDto } from 'src/modifiers/dto/create-modifier.dto';
import type { UpdateModifierGroupDto } from 'src/modifiers/dto/update-modifier.dto';

@Injectable()
export class ModifiersService {
  constructor(private readonly prismaService: PrismaService) {}

  async createGroup(
    restaurantId: number,
    createModifierGroupDto: CreateModifierGroupDto,
  ) {
    return await this.prismaService.modifierGroup.create({
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
  }

  async getGroups(restaurantId: number) {
    return await this.prismaService.modifierGroup.findMany({
      where: { restaurantId },
      include: { options: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateGroup(
    restaurantId: number,
    groupId: string,
    updateDto: UpdateModifierGroupDto,
  ) {
    const group = await this.prismaService.modifierGroup.findFirst({
      where: { id: groupId, restaurantId },
      select: { id: true },
    });

    if (!group) {
      throw new NotFoundException('errors.modifier_group_not_found');
    }

    const { options, ...groupData } = updateDto;

    return await this.prismaService.$transaction(async (tx) => {
      await tx.modifierGroup.update({
        where: { id: groupId },
        data: groupData,
      });

      if (options) {
        const incomingIds = options
          .map((o) => o.id)
          .filter((id): id is string => Boolean(id));

        const optionsToRemove = await tx.modifierOption.findMany({
          where: {
            modifierGroupId: groupId,
            id: { notIn: incomingIds },
          },
          include: {
            orderItemModifiers: { select: { id: true }, take: 1 },
          },
        });

        const safeToDeleteIds = optionsToRemove
          .filter((o) => o.orderItemModifiers.length === 0)
          .map((o) => o.id);

        const softDeleteIds = optionsToRemove
          .filter((o) => o.orderItemModifiers.length > 0)
          .map((o) => o.id);

        if (safeToDeleteIds.length > 0) {
          await tx.modifierOption.deleteMany({
            where: { id: { in: safeToDeleteIds } },
          });
        }

        if (softDeleteIds.length > 0) {
          await tx.modifierOption.updateMany({
            where: { id: { in: softDeleteIds } },
            data: { isAvailable: false },
          });
        }

        await Promise.all(
          options.map((opt) => {
            if (opt.id) {
              return tx.modifierOption.update({
                where: { id: opt.id },
                data: {
                  name: opt.name,
                  price: opt.price ?? 0,
                  isAvailable: opt.isAvailable ?? true,
                },
              });
            }
            return tx.modifierOption.create({
              data: {
                modifierGroupId: groupId,
                name: opt.name,
                price: opt.price ?? 0,
                isAvailable: opt.isAvailable ?? true,
              },
            });
          }),
        );
      }

      return await tx.modifierGroup.findUnique({
        where: { id: groupId },
        include: { options: true },
      });
    });
  }

  async deleteGroup(restaurantId: number, groupId: string) {
    const group = await this.prismaService.modifierGroup.findFirst({
      where: { id: groupId, restaurantId },
      select: { id: true },
    });

    if (!group) {
      throw new NotFoundException('errors.modifier_group_not_found');
    }

    const usedOptions = await this.prismaService.modifierOption.findFirst({
      where: { modifierGroupId: groupId, orderItemModifiers: { some: {} } },
      select: { id: true },
    });

    if (usedOptions) {
      throw new BadRequestException('errors.modifier_group_in_use');
    }

    await this.prismaService.modifierGroup.delete({ where: { id: groupId } });
    return { message: 'responses.modifier_group_deleted' };
  }
}
