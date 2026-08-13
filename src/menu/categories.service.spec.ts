import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesService } from './categories.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

const mockPrismaService = {
  category: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn().mockResolvedValue([]),
};

describe('CategoriesService', () => {
  let service: CategoriesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createCategory', () => {
    it('should throw BadRequestException if category name already exists', async () => {
      mockPrismaService.category.findFirst.mockResolvedValue({
        id: 'existing-id',
      });

      await expect(
        service.createCategory(1, { name: ' Супи ' }),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrismaService.category.findFirst).toHaveBeenCalledWith({
        where: {
          restaurantId: 1,
          name: { equals: 'Супи', mode: 'insensitive' },
        },
      });
    });

    it('should create a new category', async () => {
      mockPrismaService.category.findFirst.mockResolvedValue(null);
      mockPrismaService.category.create.mockResolvedValue({
        id: 'new-id',
        name: 'Супи',
      });

      const result = await service.createCategory(1, {
        name: 'Супи',
        sortOrder: 5,
      });

      expect(mockPrismaService.category.create).toHaveBeenCalledWith({
        data: {
          restaurantId: 1,
          name: 'Супи',
          sortOrder: 5,
        },
      });
      expect(result.message).toBe('success.category_created');
      expect(result.category).toEqual({ id: 'new-id', name: 'Супи' });
    });
  });

  describe('updateCategory', () => {
    it('should throw NotFoundException if category does not exist', async () => {
      mockPrismaService.category.findFirst.mockResolvedValue(null);

      await expect(
        service.updateCategory(1, 'invalid-id', { name: 'Супи' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if new name already exists for another category', async () => {
      // First findFirst for existence check
      mockPrismaService.category.findFirst
        .mockResolvedValueOnce({ id: 'valid-id' }) // Category exists
        .mockResolvedValueOnce({ id: 'another-id' }); // Duplicate name exists

      await expect(
        service.updateCategory(1, 'valid-id', { name: ' Супи ' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update the category', async () => {
      mockPrismaService.category.findFirst
        .mockResolvedValueOnce({ id: 'valid-id' }) // Category exists
        .mockResolvedValueOnce(null); // No duplicate name

      mockPrismaService.category.update.mockResolvedValue({
        id: 'valid-id',
        name: 'Нові Супи',
      });

      const result = await service.updateCategory(1, 'valid-id', {
        name: 'Нові Супи',
        sortOrder: 2,
      });

      expect(mockPrismaService.category.update).toHaveBeenCalledWith({
        where: { id: 'valid-id' },
        data: { name: 'Нові Супи', sortOrder: 2 },
      });
      expect(result.message).toBe('success.category_updated');
    });
  });

  describe('reorderCategories', () => {
    it('should throw BadRequestException if not all categories belong to restaurant', async () => {
      mockPrismaService.category.count.mockResolvedValue(1); // Sent 2 items, but only found 1

      await expect(
        service.reorderCategories(1, {
          items: [
            { id: 'cat1', sortOrder: 1 },
            { id: 'cat2', sortOrder: 2 },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reorder categories within transaction', async () => {
      mockPrismaService.category.count.mockResolvedValue(2);

      const result = await service.reorderCategories(1, {
        items: [
          { id: 'cat1', sortOrder: 1 },
          { id: 'cat2', sortOrder: 2 },
        ],
      });

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(result.message).toBe('success.categories_reordered');
    });
  });

  describe('deleteCategory', () => {
    it('should throw NotFoundException if category does not exist', async () => {
      mockPrismaService.category.findFirst.mockResolvedValue(null);

      await expect(service.deleteCategory(1, 'invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should delete the category', async () => {
      mockPrismaService.category.findFirst.mockResolvedValue({
        id: 'valid-id',
      });

      const result = await service.deleteCategory(1, 'valid-id');

      expect(mockPrismaService.category.delete).toHaveBeenCalledWith({
        where: { id: 'valid-id' },
      });
      expect(result.message).toBe('success.category_deleted');
    });
  });
});
