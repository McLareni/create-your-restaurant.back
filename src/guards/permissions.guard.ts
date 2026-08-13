import { Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from 'src/prisma/prisma.service';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { User } from '@prisma/client';
import { PERMISSION_REGISTRY } from 'src/common/constants/permissions.constants';

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

    const requiredPermission = this.reflector.get<string>(
      'permission',
      context.getHandler(),
    );

    const paramId = request.params?.restaurantId;
    const headerId = request.headers['x-restaurant-id'];

    const targetId = paramId ? Number(paramId) : Number(headerId);

    if (!targetId || isNaN(targetId)) {
      if (!requiredPermission) {
        return true;
      }
      throw new ForbiddenException('errors.missing_restaurant_header');
    }

    request.restaurantId = targetId;

    let contextUser = user;
    let isOwner = false;
    let restaurantActiveModules: string[] = [];

    // Try to find if this email is an OWNER of the target restaurant
    const ownerRestaurant = await this.prisma.restaurant.findFirst({
      where: { id: targetId, owner: { email: user.email } },
      select: { id: true, activeModules: true, owner: true },
    });

    if (ownerRestaurant) {
      isOwner = true;
      restaurantActiveModules = ownerRestaurant.activeModules;
      contextUser = ownerRestaurant.owner;
    } else {
      // If not OWNER, try to find if this email is STAFF in the target restaurant
      const staffUser = await this.prisma.user.findFirst({
        where: { email: user.email, restaurantId: targetId, isActive: true },
      });

      if (!staffUser) {
        throw new ForbiddenException('errors.access_denied');
      }

      contextUser = staffUser;
      const restaurant = await this.prisma.restaurant.findFirst({
        where: { id: targetId },
        select: { activeModules: true },
      });
      restaurantActiveModules = restaurant?.activeModules || [];
    }

    // Assign the resolved context user to the request so controllers use the correct user ID and role
    request.user = contextUser;

    if (!requiredPermission) {
      return true;
    }

    // Check if the permission belongs to an active module
    const CORE_MODULES = ['orders'];
    const activeSet = new Set([...restaurantActiveModules, ...CORE_MODULES]);

    const moduleDef = PERMISSION_REGISTRY.find((mod) =>
      mod.actions.some((action) => action.id === requiredPermission),
    );

    if (moduleDef && !activeSet.has(moduleDef.moduleKey)) {
      throw new ForbiddenException('errors.module_access_denied');
    }

    if (isOwner) {
      return true;
    }

    if (!contextUser.customRole) {
      throw new ForbiddenException('errors.no_role_assigned');
    }

    const roleWithPermissions = await this.prisma.staffRole.findFirst({
      where: {
        restaurantId: targetId,
        name: contextUser.customRole,
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
