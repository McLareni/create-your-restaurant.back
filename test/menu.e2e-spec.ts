import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { CategoriesController } from './../src/menu/categories.controller';
import { CategoriesService } from './../src/menu/categories.service';
import { DishesController } from './../src/menu/dishes.controller';
import { DishesService } from './../src/menu/dishes.service';
import { MenuController } from './../src/menu/menu.controller';
import { MenuService } from './../src/menu/menu.service';

describe('MenuController (e2e)', () => {
  let app: INestApplication<App>;
  const menuServiceMock = {
    create: jest.fn(),
    getMenu: jest.fn(),
    getMenuForOwner: jest.fn(),
  };

  const categoriesServiceMock = {
    createCategory: jest.fn(),
    updateCategory: jest.fn(),
    deleteCategory: jest.fn(),
  };

  const dishesServiceMock = {
    createDish: jest.fn(),
    updateDish: jest.fn(),
    deleteDish: jest.fn(),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [MenuController, CategoriesController, DishesController],
      providers: [
        {
          provide: MenuService,
          useValue: menuServiceMock,
        },
        {
          provide: CategoriesService,
          useValue: categoriesServiceMock,
        },
        {
          provide: DishesService,
          useValue: dishesServiceMock,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use((req, _res, next) => {
      (req as { user?: { id: number } }).user = { id: 1 };
      next();
    });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();
  });

  it('/menu (POST) should create menu with categories and dishes', async () => {
    const payload = {
      restaurantId: 1,
      categories: [
        {
          name: 'Pizzas',
          sortOrder: 1,
          dishes: [
            {
              name: 'Margherita',
              price: 12.5,
              allergens: ['gluten', 'lactose'],
            },
          ],
        },
      ],
    };

    menuServiceMock.create.mockResolvedValue({
      message: 'Menu created successfully',
      restaurantId: 1,
      categoriesCreated: 1,
      dishesCreated: 1,
    });

    await request(app.getHttpServer())
      .post('/menu')
      .send(payload)
      .expect(201)
      .expect({
        message: 'Menu created successfully',
        restaurantId: 1,
        categoriesCreated: 1,
        dishesCreated: 1,
      });

    expect(menuServiceMock.create).toHaveBeenCalledWith(payload, 1);
  });

  it('/menu (POST) should validate nested payload', async () => {
    await request(app.getHttpServer())
      .post('/menu')
      .send({
        restaurantId: 1,
        categories: [
          {
            name: 'Pizzas',
            dishes: [
              {
                name: '',
                price: -1,
              },
            ],
          },
        ],
      })
      .expect(400);
  });

  it('/menu/:restaurantId (GET) should return menu for all users', async () => {
    menuServiceMock.getMenu.mockResolvedValue({
      restaurantId: 1,
      categories: [
        {
          id: 'cat_1',
          name: 'Pizzas',
          sortOrder: 1,
          dishes: [
            {
              id: 'dish_1',
              name: 'Margherita',
              description: null,
              price: 12.5,
              weight: null,
              cookingTime: null,
              calories: null,
              isVegan: false,
              isSpicy: false,
              isLactoseFree: false,
              badge: 'NONE',
              allergens: ['gluten', 'lactose'],
              isAvailable: true,
            },
          ],
        },
      ],
    });

    await request(app.getHttpServer())
      .get('/menu/1')
      .expect(200)
      .expect({
        restaurantId: 1,
        categories: [
          {
            id: 'cat_1',
            name: 'Pizzas',
            sortOrder: 1,
            dishes: [
              {
                id: 'dish_1',
                name: 'Margherita',
                description: null,
                price: 12.5,
                weight: null,
                cookingTime: null,
                calories: null,
                isVegan: false,
                isSpicy: false,
                isLactoseFree: false,
                badge: 'NONE',
                allergens: ['gluten', 'lactose'],
                isAvailable: true,
              },
            ],
          },
        ],
      });

    expect(menuServiceMock.getMenu).toHaveBeenCalledWith(1);
  });

  it('/menu/:restaurantId (GET) should validate restaurantId', async () => {
    await request(app.getHttpServer()).get('/menu/abc').expect(400);
  });

  it('/menu/owner/:restaurantId (GET) should return full menu for owner', async () => {
    menuServiceMock.getMenuForOwner.mockResolvedValue({
      restaurantId: 1,
      categories: [
        {
          id: 'cat_1',
          name: 'Pizzas',
          sortOrder: 1,
          dishes: [
            {
              id: 'dish_1',
              name: 'Margherita',
              description: null,
              price: 12.5,
              weight: null,
              cookingTime: null,
              calories: null,
              isVegan: false,
              isSpicy: false,
              isLactoseFree: false,
              badge: 'NONE',
              allergens: ['gluten', 'lactose'],
              isAvailable: true,
            },
            {
              id: 'dish_2',
              name: 'Seasonal Pizza',
              description: null,
              price: 10,
              weight: null,
              cookingTime: null,
              calories: null,
              isVegan: false,
              isSpicy: false,
              isLactoseFree: false,
              badge: 'NONE',
              allergens: [],
              isAvailable: false,
            },
          ],
        },
      ],
    });

    await request(app.getHttpServer())
      .get('/menu/owner/1')
      .expect(200)
      .expect({
        restaurantId: 1,
        categories: [
          {
            id: 'cat_1',
            name: 'Pizzas',
            sortOrder: 1,
            dishes: [
              {
                id: 'dish_1',
                name: 'Margherita',
                description: null,
                price: 12.5,
                weight: null,
                cookingTime: null,
                calories: null,
                isVegan: false,
                isSpicy: false,
                isLactoseFree: false,
                badge: 'NONE',
                allergens: ['gluten', 'lactose'],
                isAvailable: true,
              },
              {
                id: 'dish_2',
                name: 'Seasonal Pizza',
                description: null,
                price: 10,
                weight: null,
                cookingTime: null,
                calories: null,
                isVegan: false,
                isSpicy: false,
                isLactoseFree: false,
                badge: 'NONE',
                allergens: [],
                isAvailable: false,
              },
            ],
          },
        ],
      });

    expect(menuServiceMock.getMenuForOwner).toHaveBeenCalledWith(1, 1);
  });

  it('/menu/owner/:restaurantId (GET) should validate restaurantId', async () => {
    await request(app.getHttpServer()).get('/menu/owner/abc').expect(400);
  });

  it('/menu/owner/categories (POST) should create category', async () => {
    const payload = {
      restaurantId: 1,
      name: 'Desserts',
      sortOrder: 2,
      dishes: [],
    };

    categoriesServiceMock.createCategory.mockResolvedValue({
      message: 'Category created successfully',
      category: { id: 'cat_2', ...payload },
    });

    await request(app.getHttpServer())
      .post('/menu/owner/categories')
      .send(payload)
      .expect(201);

    expect(categoriesServiceMock.createCategory).toHaveBeenCalledWith(
      payload,
      1,
    );
  });

  it('/menu/owner/categories/:categoryId (PATCH) should update category', async () => {
    const payload = {
      name: 'Updated category',
    };

    categoriesServiceMock.updateCategory.mockResolvedValue({
      message: 'Category updated successfully',
      category: { id: 'cat_1', name: 'Updated category', sortOrder: 1 },
    });

    await request(app.getHttpServer())
      .patch('/menu/owner/categories/cat_1')
      .send(payload)
      .expect(200);

    expect(categoriesServiceMock.updateCategory).toHaveBeenCalledWith(
      'cat_1',
      payload,
      1,
    );
  });

  it('/menu/owner/categories/:categoryId (DELETE) should delete category', async () => {
    categoriesServiceMock.deleteCategory.mockResolvedValue({
      message: 'Category deleted successfully',
    });

    await request(app.getHttpServer())
      .delete('/menu/owner/categories/cat_1')
      .expect(200)
      .expect({ message: 'Category deleted successfully' });

    expect(categoriesServiceMock.deleteCategory).toHaveBeenCalledWith(
      'cat_1',
      1,
    );
  });

  it('/menu/owner/categories/:categoryId/dishes (POST) should create dish', async () => {
    const payload = {
      name: 'Tiramisu',
      price: 6.5,
      isAvailable: true,
    };

    dishesServiceMock.createDish.mockResolvedValue({
      message: 'Dish created successfully',
      dish: { id: 'dish_3', categoryId: 'cat_2', ...payload },
    });

    await request(app.getHttpServer())
      .post('/menu/owner/categories/cat_2/dishes')
      .send(payload)
      .expect(201);

    expect(dishesServiceMock.createDish).toHaveBeenCalledWith(
      'cat_2',
      payload,
      1,
    );
  });

  it('/menu/owner/dishes/:dishId (PATCH) should update dish', async () => {
    const payload = {
      isAvailable: false,
    };

    dishesServiceMock.updateDish.mockResolvedValue({
      message: 'Dish updated successfully',
      dish: { id: 'dish_1', ...payload },
    });

    await request(app.getHttpServer())
      .patch('/menu/owner/dishes/dish_1')
      .send(payload)
      .expect(200);

    expect(dishesServiceMock.updateDish).toHaveBeenCalledWith(
      'dish_1',
      payload,
      1,
    );
  });

  it('/menu/owner/dishes/:dishId (DELETE) should delete dish', async () => {
    dishesServiceMock.deleteDish.mockResolvedValue({
      message: 'Dish deleted successfully',
    });

    await request(app.getHttpServer())
      .delete('/menu/owner/dishes/dish_1')
      .expect(200)
      .expect({ message: 'Dish deleted successfully' });

    expect(dishesServiceMock.deleteDish).toHaveBeenCalledWith('dish_1', 1);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await app.close();
  });
});
