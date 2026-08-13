import { Test, TestingModule } from '@nestjs/testing';
import { RestaurantsService } from './restaurants.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { BadRequestException } from '@nestjs/common';
import { EnumCurrency, EnumLanguage, EnumTypeRestaurant } from '@prisma/client';

describe('RestaurantsService', () => {
  let service: RestaurantsService;
  let prismaService: PrismaService;
  let cloudinaryService: CloudinaryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RestaurantsService,
        {
          provide: PrismaService,
          useValue: {
            restaurant: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
        {
          provide: CloudinaryService,
          useValue: {
            uploadImage: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RestaurantsService>(RestaurantsService);
    prismaService = module.get<PrismaService>(PrismaService);
    cloudinaryService = module.get<CloudinaryService>(CloudinaryService);
  });

  describe('create', () => {
    const mockDto = {
      title: 'New Restaurant',
      slug: 'new-restaurant',
      type: EnumTypeRestaurant.CAFE,
      currency: EnumCurrency.UAH,
      language: EnumLanguage.UA,
    };

    it('should create a restaurant successfully if limit is not reached', async () => {
      // Mock no existing restaurants
      (prismaService.restaurant.findMany as jest.Mock).mockResolvedValue([]);

      const mockCreated = { id: 1, title: mockDto.title };
      (prismaService.restaurant.create as jest.Mock).mockResolvedValue(
        mockCreated,
      );

      const result = await service.create(mockDto, 1);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(prismaService.restaurant.create).toHaveBeenCalled();
      expect(result.message).toBe('success.restaurant_created');
      expect(result.restaurant).toEqual(mockCreated);
    });

    it('should throw BadRequestException if limit is reached (default limit = 1)', async () => {
      // Mock 1 existing restaurant without multi-restaurant module
      (prismaService.restaurant.findMany as jest.Mock).mockResolvedValue([
        { activeModules: ['menu-engine', 'qr-tables', 'staff'] },
      ]);

      await expect(service.create(mockDto, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(mockDto, 1)).rejects.toThrow(
        'errors.restaurant_limit_reached_default',
      );
    });

    it('should allow up to 3 restaurants if multi-restaurant module is active', async () => {
      // Mock 2 existing restaurants, one has multi-restaurant
      (prismaService.restaurant.findMany as jest.Mock).mockResolvedValue([
        { activeModules: ['multi-restaurant', 'menu-engine'] },
        { activeModules: ['menu-engine'] },
      ]);

      (prismaService.restaurant.create as jest.Mock).mockResolvedValue({
        id: 3,
      });

      const result = await service.create(mockDto, 1);
      expect(result.message).toBe('success.restaurant_created');
    });

    it('should throw BadRequestException if limit is reached (multi-restaurant limit = 3)', async () => {
      // Mock 3 existing restaurants
      (prismaService.restaurant.findMany as jest.Mock).mockResolvedValue([
        { activeModules: ['multi-restaurant'] },
        { activeModules: [] },
        { activeModules: [] },
      ]);

      await expect(service.create(mockDto, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(mockDto, 1)).rejects.toThrow(
        'errors.restaurant_limit_reached_max',
      );
    });
  });

  describe('checkSlug', () => {
    it('should return isAvailable true if slug does not exist', async () => {
      (prismaService.restaurant.findUnique as jest.Mock).mockResolvedValue(
        null,
      );

      const result = await service.checkSlug('my-slug');
      expect(result.isAvailable).toBe(true);
    });

    it('should return isAvailable false if slug exists', async () => {
      (prismaService.restaurant.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
      });

      const result = await service.checkSlug('existing-slug');
      expect(result.isAvailable).toBe(false);
    });
  });

  describe('uploadCover', () => {
    it('should throw BadRequestException if no file is provided', async () => {
      await expect(service.uploadCover(undefined as any)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.uploadCover(undefined as any)).rejects.toThrow(
        'errors.photo_required',
      );
    });

    it('should throw BadRequestException if file is not an image', async () => {
      const mockFile = { mimetype: 'application/pdf' } as any;
      await expect(service.uploadCover(mockFile)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.uploadCover(mockFile)).rejects.toThrow(
        'errors.invalid_file_type',
      );
    });

    it('should upload image and return url', async () => {
      const mockFile = {
        mimetype: 'image/jpeg',
        buffer: Buffer.from('test'),
      } as any;
      (cloudinaryService.uploadImage as jest.Mock).mockResolvedValue({
        secure_url: 'http://image.url',
      });

      const result = await service.uploadCover(mockFile);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(cloudinaryService.uploadImage).toHaveBeenCalledWith(
        mockFile.buffer,
        'restaurants',
      );
      expect(result.imageUrl).toBe('http://image.url');
    });
  });

  describe('connectModule', () => {
    it('should reject if module key is invalid', async () => {
      await expect(
        service.connectModule(1, 'hacker-module', undefined, 1),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.connectModule(1, 'hacker-module', undefined, 1),
      ).rejects.toThrow('errors.invalid_module_key');
    });

    it('should reject paid module if activation code is invalid or empty', async () => {
      await expect(
        service.connectModule(1, 'analytics', undefined, 1),
      ).rejects.toThrow('errors.invalid_activation_code');
      await expect(
        service.connectModule(1, 'analytics', 'WRONG', 1),
      ).rejects.toThrow('errors.invalid_activation_code');
    });

    it('should reject multi-restaurant if already purchased elsewhere', async () => {
      (prismaService.restaurant.findMany as jest.Mock).mockResolvedValue([
        { id: 2, purchasedModules: ['multi-restaurant'] },
      ]);
      await expect(
        service.connectModule(1, 'multi-restaurant', 'GUSTIO-2026', 1),
      ).rejects.toThrow('errors.module_already_purchased');
    });
  });

  describe('toggleModule', () => {
    it('should reject toggle if multi-restaurant is not main', async () => {
      (prismaService.restaurant.findFirst as jest.Mock).mockResolvedValue({
        id: 2,
        purchasedModules: [],
        activeModules: [],
      });
      (prismaService.restaurant.findMany as jest.Mock).mockResolvedValue([
        { id: 1, purchasedModules: ['multi-restaurant'] },
        { id: 2, purchasedModules: [] },
      ]);

      await expect(
        service.toggleModule(2, 'multi-restaurant', false, 1),
      ).rejects.toThrow('errors.only_main_can_toggle_multi');
    });
  });
});
