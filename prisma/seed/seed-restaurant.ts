import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient({ accelerateUrl: process.env.DATABASE_URL });

async function main() {
  const targetDishId = 'd5cff960-8cdc-4655-95f5-365cab53b6dc';
  
  // Find the restaurant ID based on the dish
  const existingDish = await prisma.dish.findUnique({
    where: { id: targetDishId },
    include: { category: true }
  });
  
  if (!existingDish) {
    console.error('Dish not found!');
    
    // Fallback: try to find any restaurant
    const latestRestaurant = await prisma.restaurant.findFirst();
    
    if (!latestRestaurant) {
      console.error('No restaurants found in DB');
      process.exit(1);
    }
    
    console.log(`Fallback to first restaurant: ${latestRestaurant.title} (ID: ${latestRestaurant.id})`);
    await seedRestaurant(latestRestaurant.id);
  } else {
    console.log(`Found dish! Associated restaurant ID: ${existingDish.category.restaurantId}`);
    await seedRestaurant(existingDish.category.restaurantId);
  }
}

async function seedRestaurant(restaurantId: number) {
  console.log(`Seeding data for restaurant ID: ${restaurantId}...`);

  // Create "Основні страви" category
  const mainCat = await prisma.category.create({
    data: {
      name: 'Основні страви (Тест)',
      sortOrder: 100,
      restaurantId,
    }
  });

  // Create "Напої" category
  const drinksCat = await prisma.category.create({
    data: {
      name: 'Напої (Тест)',
      sortOrder: 101,
      restaurantId,
    }
  });

  // Create some dishes
  await prisma.dish.create({
    data: {
      name: 'Стейк Рібай (Тест)',
      description: 'Соковитий стейк з мармурової яловичини.',
      price: 650,
      categoryId: mainCat.id,
      weight: 350,
      calories: 850,
      cookingTime: 25,
      isAvailable: true,
      badge: 'TOP_RATED',
    }
  });

  const burger = await prisma.dish.create({
    data: {
      name: 'Бургер від Шефа (Тест)',
      description: 'Подвійна котлета, сир чеддер, бекон та фірмовий соус.',
      price: 280,
      categoryId: mainCat.id,
      weight: 400,
      calories: 900,
      cookingTime: 15,
      isAvailable: true,
      badge: 'HIT',
    }
  });

  await prisma.dish.create({
    data: {
      name: 'Капучино (Тест)',
      description: 'Класичний італійський кавовий напій.',
      price: 85,
      categoryId: drinksCat.id,
      weight: 250,
      calories: 120,
      cookingTime: 5,
      isAvailable: true,
    }
  });

  // Create Modifiers Group for Burger
  const modGroup = await prisma.modifierGroup.create({
    data: {
      name: 'Ступінь просмаження (Тест)',
      isRequired: true,
      minSelections: 1,
      maxSelections: 1,
      restaurantId,
    }
  });

  await prisma.modifierOption.createMany({
    data: [
      { name: 'Medium Rare', price: 0, modifierGroupId: modGroup.id },
      { name: 'Medium', price: 0, modifierGroupId: modGroup.id },
      { name: 'Well Done', price: 0, modifierGroupId: modGroup.id },
    ]
  });

  // Attach modifier group to dish
  await prisma.dishModifier.create({
    data: {
      dishId: burger.id,
      modifierGroupId: modGroup.id,
    }
  });
  
  // Extra Toppings
  const toppingsGroup = await prisma.modifierGroup.create({
    data: {
      name: 'Додаткові інгредієнти (Тест)',
      isRequired: false,
      minSelections: 0,
      maxSelections: 3,
      restaurantId,
    }
  });

  await prisma.modifierOption.createMany({
    data: [
      { name: 'Екстра сир', price: 40, modifierGroupId: toppingsGroup.id },
      { name: 'Бекон', price: 50, modifierGroupId: toppingsGroup.id },
      { name: 'Халапеньйо', price: 30, modifierGroupId: toppingsGroup.id },
    ]
  });

  await prisma.dishModifier.create({
    data: {
      dishId: burger.id,
      modifierGroupId: toppingsGroup.id,
    }
  });

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
