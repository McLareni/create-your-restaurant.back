import type { User } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      restaurantId?: number;
      user?: User;
    }
  }
}
