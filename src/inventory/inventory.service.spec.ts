import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from './inventory.service';
import { PrismaService } from 'src/prisma/prisma.service';

describe('InventoryService', () => {
  const inventoryItemStateCreate = jest.fn();
  const inventoryItemFindFirst = jest.fn();
  const inventoryItemCreate = jest.fn();
  const inventoryItemUpdate = jest.fn();
  const dishIngredientFindMany = jest.fn();
  const dishUpdateMany = jest.fn();

  const prismaServiceMock = {
    inventoryItem: {
      create: inventoryItemCreate,
      findFirst: inventoryItemFindFirst,
      update: inventoryItemUpdate,
    },
    inventoryItemState: {
      create: inventoryItemStateCreate,
      findMany: jest.fn(),
    },
    dishIngredient: {
      findMany: dishIngredientFindMany,
    },
    dish: {
      updateMany: dishUpdateMany,
    },
    $transaction: jest.fn(),
  };

  let service: InventoryService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: PrismaService, useValue: prismaServiceMock },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
  });

  it('should create an inventory item and save its initial state history', async () => {
    inventoryItemCreate.mockResolvedValue({ id: 'item-1', stock: 15, name: 'Tomato', unit: 'kg' });
    inventoryItemStateCreate.mockResolvedValue({ id: 'state-1' });

    const result = await service.create(1, { name: 'Tomato', stock: 15, unit: 'kg' }, 7);

    expect(inventoryItemCreate).toHaveBeenCalledWith({
      data: {
        restaurantId: 1,
        name: 'Tomato',
        stock: 15,
        unit: 'kg',
      },
    });
    expect(inventoryItemStateCreate).toHaveBeenCalledWith({
      data: {
        inventoryItemId: 'item-1',
        quantity: 15,
        recordedAt: expect.any(Date),
        createdByUserId: 7,
      },
    });
    expect(result).toEqual({ id: 'item-1', stock: 15, name: 'Tomato', unit: 'kg' });
  });

  it('should append a dated stock state when the quantity is updated', async () => {
    inventoryItemFindFirst.mockResolvedValue({ id: 'item-1', restaurantId: 1, stock: 12 });

    const txMock = {
      inventoryItem: {
        update: jest.fn().mockResolvedValue({ id: 'item-1', stock: 20, name: 'Tomato', unit: 'kg' }),
      },
      inventoryItemState: {
        create: inventoryItemStateCreate,
      },
      dishIngredient: {
        findMany: dishIngredientFindMany.mockResolvedValue([]),
      },
      dish: {
        updateMany: dishUpdateMany,
      },
      inventoryItemStateCreate,
    };

    prismaServiceMock.$transaction.mockImplementation(async (callback) => callback(txMock));

    await service.update(1, 'item-1', { stock: 20, recordedAt: '2026-08-17T12:00:00.000Z' }, 9);

    expect(txMock.inventoryItem.update).toHaveBeenCalledWith({
      where: { id: 'item-1' },
      data: { stock: 20 },
    });
    expect(inventoryItemStateCreate).toHaveBeenCalledWith({
      data: {
        inventoryItemId: 'item-1',
        quantity: 20,
        recordedAt: new Date('2026-08-17T12:00:00.000Z'),
        createdByUserId: 9,
      },
    });
  });
});
