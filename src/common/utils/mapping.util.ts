import type { Prisma, User } from '@prisma/client';

type DishWithImages = Prisma.DishGetPayload<{
  include: {
    images: {
      include: {
        image: true;
      };
    };
  };
}>;

type OrderWithItems = Prisma.OrderGetPayload<{
  include: {
    items: {
      include: {
        dish: true;
        modifiers: {
          include: {
            modifierOption: true;
          };
        };
      };
    };
  };
}>;

export class DataMappingUtil {
  static mapToUiStaff(user: User & { customRole?: string | null }) {
    return {
      id: String(user.id),
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.customRole || user.role,
      isActive: user.isActive,
      photo: user.photo,
    };
  }

  static mapDishImages(dish: DishWithImages) {
    const mappedImages = dish.images?.map(({ image }) => image) ?? [];
    return {
      ...dish,
      images: mappedImages,
      imageUrl: mappedImages[0]?.url || null,
    };
  }

  static mapOrder(order: OrderWithItems) {
    return {
      ...order,
      items:
        order.items?.map((item) => ({
          id: item.id,
          dishId: item.dishId,
          dishName: item.dish?.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.quantity * item.unitPrice,
          modifiers:
            item.modifiers?.map((modifier) => ({
              id: modifier.id,
              modifierOptionId: modifier.modifierOptionId,
              modifierName: modifier.modifierOption?.name,
              quantity: modifier.quantity,
              unitPrice: modifier.unitPrice,
              lineTotal: modifier.quantity * modifier.unitPrice,
            })) ?? [],
        })) ?? [],
    };
  }
}
