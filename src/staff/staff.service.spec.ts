import { Test, TestingModule } from '@nestjs/testing';
import { StaffService } from './staff.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { EnumRole } from '@prisma/client';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
}));

const mockPrismaService = {
  restaurant: {
    findFirst: jest.fn(),
  },
  staffRole: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    delete: jest.fn(),
  },
  user: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    updateMany: jest.fn(),
  },
  $transaction: jest.fn((callback) => callback(mockPrismaService)),
};

const mockCloudinaryService = {
  uploadImage: jest.fn(),
};

describe('StaffService', () => {
  let service: StaffService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StaffService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CloudinaryService, useValue: mockCloudinaryService },
      ],
    }).compile();

    service = module.get<StaffService>(StaffService);
  });

  describe('getAvailablePermissions', () => {
    it('should return allowed permissions for a restaurant', async () => {
      mockPrismaService.restaurant.findFirst.mockResolvedValue({
        activeModules: ['menu-engine'],
      });
      const perms = await service.getAvailablePermissions(1, 1);
      const keys = perms.map((p) => p.moduleKey);
      expect(keys).toContain('orders'); // CORE_MODULES
      expect(keys).toContain('menu-engine');
    });

    it('should throw NotFoundException if restaurant not found', async () => {
      mockPrismaService.restaurant.findFirst.mockResolvedValue(null);
      await expect(service.getAvailablePermissions(1, 1)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createStaffRole', () => {
    it('should throw NotFoundException if access denied', async () => {
      mockPrismaService.restaurant.findFirst.mockResolvedValue(null);
      await expect(
        service.createStaffRole(1, { name: 'Manager' }, 1),
      ).rejects.toThrow(NotFoundException);
    });

    it('should filter invalid permissions and create role', async () => {
      mockPrismaService.restaurant.findFirst
        .mockResolvedValueOnce({ id: 1 }) // for access check
        .mockResolvedValueOnce({ activeModules: ['menu-engine'] }); // for getAvailablePermissions

      mockPrismaService.staffRole.findUnique.mockResolvedValue(null);
      mockPrismaService.staffRole.create.mockResolvedValue({ id: '123' });

      await service.createStaffRole(
        1,
        { name: 'Manager', permissions: ['orders:read', 'fake:perm'] },
        1,
      );

      expect(mockPrismaService.staffRole.create).toHaveBeenCalledWith({
        data: {
          restaurantId: 1,
          name: 'Manager',
          permissions: ['orders:read'], // fake:perm is filtered out
        },
      });
    });
  });

  describe('updateStaffRole', () => {
    it('should update role by filtering permissions', async () => {
      mockPrismaService.staffRole.findFirst.mockResolvedValue({ id: 'role1' });
      mockPrismaService.restaurant.findFirst.mockResolvedValue({
        activeModules: ['orders'],
      });
      mockPrismaService.staffRole.update.mockResolvedValue({ id: 'role1' });

      await service.updateStaffRole(1, 'role1', ['orders:read', 'invalid'], 1);

      expect(mockPrismaService.staffRole.update).toHaveBeenCalledWith({
        where: { id: 'role1' },
        data: { permissions: ['orders:read'] },
      });
    });
  });

  describe('createStaff', () => {
    it('should throw ForbiddenException if trying to assign a role without permission', async () => {
      mockPrismaService.restaurant.findFirst.mockResolvedValue({ id: 1 });
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 2,
        role: EnumRole.STAFF,
        customRole: 'Waiter',
      });
      mockPrismaService.staffRole.findFirst.mockResolvedValue({
        permissions: ['orders:read'],
      }); // Caller has no staff:roles

      await expect(
        service.createStaff(
          1,
          {
            email: 'test@example.com',
            firstName: 'Test',
            lastName: 'Test',
            role: 'Admin',
          },
          2,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow creating staff if caller is OWNER', async () => {
      mockPrismaService.restaurant.findFirst.mockResolvedValue({ id: 1 });
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 1,
        role: EnumRole.OWNER,
      });
      mockPrismaService.staffRole.findFirst.mockResolvedValue({ id: '1' }); // Role exists
      mockPrismaService.user.findFirst.mockResolvedValue(null); // Email check
      mockPrismaService.user.create.mockResolvedValue({ id: 3 });

      const result = await service.createStaff(
        1,
        {
          email: 'test@example.com',
          firstName: 'A',
          lastName: 'B',
          role: 'Admin',
          password: '123',
        },
        1,
      );

      expect(result.message).toBe('success.staff_created');
      expect(mockPrismaService.user.create).toHaveBeenCalled();
    });
  });

  describe('updateStaff', () => {
    it('should throw ForbiddenException if trying to update role without permission', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({ id: 3 }); // target staff
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 2,
        role: EnumRole.STAFF,
      }); // caller

      await expect(
        service.updateStaff(1, '3', { role: 'Manager' }, 2),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow updating role if caller has staff:roles permission', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({ id: 3 }); // target staff
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 2,
        role: EnumRole.STAFF,
        customRole: 'HR',
      }); // caller
      mockPrismaService.staffRole.findFirst
        .mockResolvedValueOnce({ permissions: ['staff:roles'] }) // caller role check
        .mockResolvedValueOnce({ id: 'role_exists' }); // target role check
      mockPrismaService.user.update.mockResolvedValue({ id: 3 });

      const result = await service.updateStaff(1, '3', { role: 'Manager' }, 2);
      expect(result.message).toBe('success.staff_updated');
    });

    it('should allow updating basic info without role permission', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({ id: 3 }); // target staff
      mockPrismaService.user.update.mockResolvedValue({ id: 3 });

      const result = await service.updateStaff(1, '3', { firstName: 'New' }, 2);
      expect(result.message).toBe('success.staff_updated');
    });
  });

  describe('deleteStaff', () => {
    it('should throw BadRequestException if trying to delete self', async () => {
      await expect(service.deleteStaff(1, '2', 2)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should delete staff', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({ id: 3 });
      mockPrismaService.user.delete.mockResolvedValue({ id: 3 });

      const result = await service.deleteStaff(1, '3', 2);
      expect(result.message).toBe('success.staff_deleted');
      expect(mockPrismaService.user.delete).toHaveBeenCalledWith({
        where: { id: 3 },
      });
    });
  });

  describe('deleteStaffRole', () => {
    it('should fallback users to STAFF and delete role', async () => {
      mockPrismaService.staffRole.findFirst.mockResolvedValue({
        id: 'r1',
        name: 'Cook',
      });
      const result = await service.deleteStaffRole(1, 'r1', 1);

      expect(mockPrismaService.user.updateMany).toHaveBeenCalledWith({
        where: { restaurantId: 1, customRole: 'Cook' },
        data: { customRole: null, role: EnumRole.STAFF },
      });
      expect(mockPrismaService.staffRole.delete).toHaveBeenCalledWith({
        where: { id: 'r1' },
      });
      expect(result.message).toBe('success.role_deleted');
    });
  });
});
