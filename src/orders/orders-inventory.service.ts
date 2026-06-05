import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Injectable()
export class OrdersInventoryService {
  async processInventoryRequirements(
    tx: Prisma.TransactionClient,
    restaurantId: number,
    inventoryRequirements: Map<string, { amount: number; name: string }>,
  ) {
    if (inventoryRequirements.size === 0) return;

    const requiredIds = Array.from(inventoryRequirements.keys());
    const stockItems = await tx.inventoryItem.findMany({
      where: { id: { in: requiredIds }, restaurantId },
      select: { id: true, name: true, stock: true, unit: true },
    });

    const stockMap = new Map(stockItems.map((s) => [s.id, s]));

    for (const [itemId, req] of inventoryRequirements.entries()) {
      const stockItem = stockMap.get(itemId);
      if (!stockItem) {
        throw new BadRequestException(
          `Компонент складу "${req.name}" не знайдено`,
        );
      }
      if (stockItem.stock < req.amount) {
        throw new BadRequestException(
          `Недостатньо залишків на складі для "${stockItem.name}". Необхідно: ${req.amount} ${stockItem.unit}, в наявності: ${stockItem.stock} ${stockItem.unit}`,
        );
      }
    }

    for (const [itemId, req] of inventoryRequirements.entries()) {
      const updatedItem = await tx.inventoryItem.update({
        where: { id: itemId },
        data: { stock: { decrement: req.amount } },
      });

      const affectedIngredients = await tx.dishIngredient.findMany({
        where: { inventoryItemId: itemId },
        select: { dishId: true, quantity: true },
      });

      for (const ing of affectedIngredients) {
        if (updatedItem.stock < ing.quantity) {
          await tx.dish.update({
            where: { id: ing.dishId },
            data: { isAvailable: false },
          });
        }
      }
    }
  }
}
