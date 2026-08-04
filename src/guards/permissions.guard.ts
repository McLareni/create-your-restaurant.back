import { Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from 'src/prisma/prisma.service';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { User } from '@prisma/client';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as User | undefined;

    if (!user) {
      throw new ForbiddenException('errors.access_denied');
    }

    const paramId = request.params?.restaurantId;
    const headerId = request.headers['x-restaurant-id'];

    const targetId = paramId ? Number(paramId) : Number(headerId);

    if (!targetId || isNaN(targetId)) {
      throw new ForbiddenException('errors.missing_restaurant_header');
    }

    request.restaurantId = targetId;

    let isOwner = false;

    if (user.role === 'OWNER') {
      const restaurant = await this.prisma.restaurant.findFirst({
        where: { id: targetId, ownerId: user.id },
        select: { id: true },
      });

      if (!restaurant) {
        throw new ForbiddenException('errors.access_denied');
      }
      isOwner = true;
    } else if (user.role === 'STAFF') {
      if (user.restaurantId !== targetId || !user.isActive) {
        throw new ForbiddenException('errors.access_denied');
      }
    } else {
      throw new ForbiddenException('errors.access_denied');
    }

    const requiredPermission = this.reflector.get<string>(
      'permission',
      context.getHandler(),
    );

    if (!requiredPermission || isOwner) {
      return true;
    }

    if (!user.customRole) {
      throw new ForbiddenException('errors.no_role_assigned');
    }

    const roleWithPermissions = await this.prisma.staffRole.findFirst({
      where: {
        restaurantId: targetId,
        name: user.customRole,
      },
      select: { permissions: true },
    });

    if (
      !roleWithPermissions ||
      !roleWithPermissions.permissions.includes(requiredPermission)
    ) {
      throw new ForbiddenException('errors.module_access_denied');
    }

    return true;
  }
}
