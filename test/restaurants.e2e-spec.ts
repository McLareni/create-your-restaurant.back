import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { RestaurantsController } from './../src/restaurants/restaurants.controller';
import { RestaurantsService } from './../src/restaurants/restaurants.service';

describe('RestaurantsController (e2e)', () => {
  let app: INestApplication<App>;
  const restaurantsServiceMock = {
    create: jest.fn(),
    checkSlug: jest.fn(),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [RestaurantsController],
      providers: [
        {
          provide: RestaurantsService,
          useValue: restaurantsServiceMock,
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

  it('/restaurants (POST) should create restaurant', async () => {
    const payload = {
      title: 'Pizza House',
      slug: 'pizza-house',
      type: 'CAFE',
      currency: 'USD',
      phoneNumber: '+380991112233',
      city: 'Kyiv',
      language: 'UA',
    };

    restaurantsServiceMock.create.mockResolvedValue({
      message: 'Restaurant created successfully',
      restaurant: {
        id: 1,
        ...payload,
      },
    });

    await request(app.getHttpServer())
      .post('/restaurants')
      .send(payload)
      .expect(201)
      .expect({
        message: 'Restaurant created successfully',
        restaurant: {
          id: 1,
          ...payload,
        },
      });

    expect(restaurantsServiceMock.create).toHaveBeenCalledWith(payload, 1);
  });

  it('/restaurants (POST) should validate enum fields', async () => {
    await request(app.getHttpServer())
      .post('/restaurants')
      .send({
        title: 'Pizza House',
        slug: 'pizza-house',
        type: 'INVALID_TYPE',
        currency: 'USD',
        language: 'UA',
      })
      .expect(400);
  });

  it('/restaurants/check-restaurant-slug (POST) should return slug availability', async () => {
    restaurantsServiceMock.checkSlug.mockResolvedValue({
      isAvailable: true,
    });

    await request(app.getHttpServer())
      .post('/restaurants/check-restaurant-slug')
      .send({ slug: 'pizza-house' })
      .expect(201)
      .expect({ isAvailable: true });

    expect(restaurantsServiceMock.checkSlug).toHaveBeenCalledWith(
      'pizza-house',
    );
  });

  it('/restaurants/check-restaurant-slug (POST) should validate slug', async () => {
    await request(app.getHttpServer())
      .post('/restaurants/check-restaurant-slug')
      .send({ slug: '' })
      .expect(400);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await app.close();
  });
});
