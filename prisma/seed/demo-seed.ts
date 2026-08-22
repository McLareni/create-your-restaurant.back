import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient({ accelerateUrl: process.env.DATABASE_URL });
const demoSlug = 'gustio-demo';
const ownerEmail = 'owner@gustio.demo';
const staffEmail = 'waiter@gustio.demo';

async function main() {
  let owner = await prisma.user.findFirst({ where: { email: ownerEmail } });
  if (!owner) {
    owner = await prisma.user.create({
      data: {
        email: ownerEmail,
        firstName: 'Олена',
        lastName: 'Власниця',
        role: 'OWNER',
        isActive: true,
      },
    });
  }

  const restaurant = await prisma.restaurant.upsert({
    where: { slug: demoSlug },
    update: { ownerId: owner.id, title: 'Gustio Demo Restaurant' },
    create: {
      title: 'Gustio Demo Restaurant',
      slug: demoSlug,
      type: 'CASUAL_DINING',
      currency: 'UAH',
      language: 'UA',
      city: 'Київ',
      street: 'Хрещатик',
      building: '1',
      ownerId: owner.id,
      activeModules: ['menu-engine', 'qr-tables', 'staff', 'orders'],
      purchasedModules: ['menu-engine', 'qr-tables', 'staff', 'orders'],
      visualSettings: {
        primaryColor: '#0f766e',
        theme: 'light',
        buttonStyle: 'solid',
        cardStyle: 'standard',
      },
    },
  });

  const waiterRole = await prisma.staffRole.upsert({
    where: { restaurantId_name: { restaurantId: restaurant.id, name: 'Офіціант' } },
    update: { permissions: ['orders:read', 'orders:manage', 'tables:read'] },
    create: {
      restaurantId: restaurant.id,
      name: 'Офіціант',
      permissions: ['orders:read', 'orders:manage', 'tables:read'],
    },
  });

  await prisma.user.upsert({
    where: { email_restaurantId: { email: staffEmail, restaurantId: restaurant.id } },
    update: { firstName: 'Андрій', lastName: 'Офіціант', customRole: waiterRole.name, isActive: true },
    create: {
      email: staffEmail,
      firstName: 'Андрій',
      lastName: 'Офіціант',
      role: 'STAFF',
      customRole: waiterRole.name,
      restaurantId: restaurant.id,
      isActive: true,
    },
  });

  const categories = [
    { name: 'Основні страви', sortOrder: 1 },
    { name: 'Напої', sortOrder: 2 },
    { name: 'Десерти', sortOrder: 3 },
  ];

  const categoryMap = new Map<string, string>();
  for (const categoryData of categories) {
    const category = await prisma.category.findFirst({
      where: { restaurantId: restaurant.id, name: categoryData.name },
    });
    const savedCategory = category ?? await prisma.category.create({ data: { ...categoryData, restaurantId: restaurant.id } });
    categoryMap.set(categoryData.name, savedCategory.id);
  }

  const dishes = [
    { name: 'Паста з куркою', description: 'Паста пенне, курка, вершковий соус і пармезан.', price: 245, category: 'Основні страви', badge: 'HIT' as const },
    { name: 'Бургер Gustio', description: 'Яловича котлета, чедер, салат і соус BBQ.', price: 285, category: 'Основні страви', badge: 'TOP_RATED' as const },
    { name: 'Лимонад цитрусовий', description: 'Домашній лимонад з лимоном, лаймом і м\'ятою.', price: 95, category: 'Напої', badge: 'NEW' as const },
    { name: 'Капучино', description: 'Еспресо з молочною пінкою.', price: 75, category: 'Напої', badge: 'NONE' as const },
    { name: 'Чізкейк', description: 'Ніжний сирний десерт з ягідним соусом.', price: 145, category: 'Десерти', badge: 'CHEF_CHOICE' as const },
  ];

  for (const dish of dishes) {
    const categoryId = categoryMap.get(dish.category);
    if (!categoryId) continue;
    const existingDish = await prisma.dish.findFirst({ where: { categoryId, name: dish.name } });
    if (existingDish) {
      await prisma.dish.update({ where: { id: existingDish.id }, data: { description: dish.description, price: dish.price, badge: dish.badge, isAvailable: true } });
    } else {
      await prisma.dish.create({ data: { name: dish.name, description: dish.description, price: dish.price, badge: dish.badge, categoryId, isAvailable: true } });
    }
  }

  for (let number = 1; number <= 8; number += 1) {
    await prisma.diningTable.upsert({
      where: { number_restaurantId: { number, restaurantId: restaurant.id } },
      update: { status: 'ACTIVE', type: number <= 4 ? 'Зал' : 'Тераса' },
      create: { number, type: number <= 4 ? 'Зал' : 'Тераса', status: 'ACTIVE', restaurantId: restaurant.id },
    });
  }

  console.log(`Demo data ready: ${restaurant.title}`);
  console.log(`Menu URL: /menu/${restaurant.slug}`);
  console.log(`Owner: ${ownerEmail}`);
  console.log(`Staff: ${staffEmail}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());

