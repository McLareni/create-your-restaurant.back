import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { OrderStatus, OrderType } from '@prisma/client';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import request from 'supertest';
import { App } from 'supertest/types';
import { OrdersController } from './../src/orders/orders.controller';
import { OrdersService } from './../src/orders/orders.service';

describe('OrdersController (e2e)', () => {
  let app: INestApplication<App>;

  const ordersServiceMock = {
    createOrder: jest.fn(),
    getOrders: jest.fn(),
    getOrderById: jest.fn(),
    updateOrder: jest.fn(),
    deleteOrder: jest.fn(),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        {
          provide: OrdersService,
          useValue: ordersServiceMock,
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

  it('/restaurants/:restaurantId/orders (POST) should create order with modifiers', async () => {
    const payload = {
      type: OrderType.DINE_IN,
      tableId: '1a2d7d9c-5f73-4bf0-b89a-f12474a584d3',
      items: [
        {
          dishId: 'df5b80f5-c448-4c5b-a651-6ccdc59827d2',
          quantity: 2,
          modifiers: [
            {
              modifierOptionId: '8eebf4f4-40aa-4dd0-b7d4-1a58ec4a9e89',
              quantity: 3,
            },
          ],
        },
      ],
    };

    ordersServiceMock.createOrder.mockResolvedValue({
      message: 'Order created successfully',
      order: {
        id: 'order-1',
        restaurantId: 1,
        tableId: payload.tableId,
        type: OrderType.DINE_IN,
        status: OrderStatus.PENDING,
        totalAmount: 980,
        createdAt: '2026-05-20T12:00:00.000Z',
        updatedAt: '2026-05-20T12:00:00.000Z',
        table: {
          id: payload.tableId,
          number: 12,
          type: 'TERRACE',
        },
        items: [
          {
            id: 'order-item-1',
            dishId: 'df5b80f5-c448-4c5b-a651-6ccdc59827d2',
            dishName: 'Margherita',
            quantity: 2,
            unitPrice: 490,
            lineTotal: 980,
            modifiers: [
              {
                id: 'item-mod-1',
                modifierOptionId: '8eebf4f4-40aa-4dd0-b7d4-1a58ec4a9e89',
                modifierName: 'Extra cheese',
                quantity: 3,
                unitPrice: 30,
                lineTotal: 90,
              },
            ],
          },
        ],
      },
    });

    await request(app.getHttpServer())
      .post('/restaurants/1/orders')
      .send(payload)
      .expect(201)
      .expect((response) => {
        expect(response.body.message).toBe('Order created successfully');
        expect(response.body.order.id).toBe('order-1');
        expect(response.body.order.items[0].modifiers[0].quantity).toBe(3);
      });

    expect(ordersServiceMock.createOrder).toHaveBeenCalledWith(1, payload, 1);
  });

  it('/restaurants/:restaurantId/orders (POST) should validate payload', async () => {
    await request(app.getHttpServer())
      .post('/restaurants/1/orders')
      .send({
        type: 'DINE_IN',
        items: [
          {
            dishId: 'not-uuid',
            quantity: 0,
            modifiers: [
              {
                modifierOptionId: 'also-not-uuid',
                quantity: 0,
              },
            ],
          },
        ],
      })
      .expect(400);
  });

  it('/restaurants/:restaurantId/orders (GET) should return orders list', async () => {
    ordersServiceMock.getOrders.mockResolvedValue([
      {
        id: 'order-1',
        restaurantId: 1,
        tableId: '1a2d7d9c-5f73-4bf0-b89a-f12474a584d3',
        type: OrderType.DINE_IN,
        status: OrderStatus.PENDING,
        totalAmount: 980,
        items: [
          {
            id: 'order-item-1',
            dishId: 'df5b80f5-c448-4c5b-a651-6ccdc59827d2',
            dishName: 'Margherita',
            quantity: 2,
            unitPrice: 490,
            lineTotal: 980,
            modifiers: [
              {
                id: 'item-mod-1',
                modifierOptionId: '8eebf4f4-40aa-4dd0-b7d4-1a58ec4a9e89',
                modifierName: 'Extra cheese',
                quantity: 3,
                unitPrice: 30,
                lineTotal: 90,
              },
            ],
          },
        ],
      },
    ]);

    await request(app.getHttpServer())
      .get('/restaurants/1/orders?status=PENDING')
      .expect(200)
      .expect((response) => {
        expect(response.body).toHaveLength(1);
        expect(response.body[0].status).toBe('PENDING');
      });

    expect(ordersServiceMock.getOrders).toHaveBeenCalledWith(
      1,
      1,
      OrderStatus.PENDING,
    );
  });

  it('/restaurants/:restaurantId/orders/:orderId (GET) should return order by id', async () => {
    ordersServiceMock.getOrderById.mockResolvedValue({
      id: 'order-1',
      restaurantId: 1,
      status: OrderStatus.PENDING,
      items: [],
    });

    await request(app.getHttpServer())
      .get('/restaurants/1/orders/order-1')
      .expect(200)
      .expect({
        id: 'order-1',
        restaurantId: 1,
        status: OrderStatus.PENDING,
        items: [],
      });

    expect(ordersServiceMock.getOrderById).toHaveBeenCalledWith(
      1,
      'order-1',
      1,
    );
  });

  it('/restaurants/:restaurantId/orders/:orderId (PATCH) should update order', async () => {
    const payload = {
      status: OrderStatus.IN_PROGRESS,
    };

    ordersServiceMock.updateOrder.mockResolvedValue({
      message: 'Order updated successfully',
      order: {
        id: 'order-1',
        status: OrderStatus.IN_PROGRESS,
      },
    });

    await request(app.getHttpServer())
      .patch('/restaurants/1/orders/order-1')
      .send(payload)
      .expect(200)
      .expect({
        message: 'Order updated successfully',
        order: {
          id: 'order-1',
          status: OrderStatus.IN_PROGRESS,
        },
      });

    expect(ordersServiceMock.updateOrder).toHaveBeenCalledWith(
      1,
      'order-1',
      payload,
      1,
    );
  });

  it('/restaurants/:restaurantId/orders/:orderId (DELETE) should delete order', async () => {
    ordersServiceMock.deleteOrder.mockResolvedValue({
      message: 'Order deleted successfully',
    });

    await request(app.getHttpServer())
      .delete('/restaurants/1/orders/order-1')
      .expect(200)
      .expect({ message: 'Order deleted successfully' });

    expect(ordersServiceMock.deleteOrder).toHaveBeenCalledWith(1, 'order-1', 1);
  });

  it('Swagger should fully describe orders endpoints', () => {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Create Your Restaurant API')
      .setDescription('API documentation for Create Your Restaurant service')
      .setVersion('1.0')
      .addCookieAuth(
        'gustio_session',
        {
          type: 'apiKey',
          in: 'cookie',
          name: 'gustio_session',
          description: 'Session token from cookie',
        },
        'gustio_session',
      )
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);

    const ordersCollectionPath =
      document.paths['/restaurants/{restaurantId}/orders'];
    expect(ordersCollectionPath).toBeDefined();

    expect(ordersCollectionPath.post).toBeDefined();
    expect(ordersCollectionPath.post.summary).toBe('Create order');
    expect(ordersCollectionPath.post.requestBody).toBeDefined();
    expect(Object.keys(ordersCollectionPath.post.responses)).toEqual(
      expect.arrayContaining(['201', '400', '401', '404']),
    );
    expect(ordersCollectionPath.post.security).toEqual([
      { gustio_session: [] },
    ]);

    expect(ordersCollectionPath.get).toBeDefined();
    expect(ordersCollectionPath.get.summary).toBe('Get restaurant orders');
    expect(ordersCollectionPath.get.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ in: 'path', name: 'restaurantId' }),
        expect.objectContaining({ in: 'query', name: 'status' }),
      ]),
    );
    expect(Object.keys(ordersCollectionPath.get.responses)).toEqual(
      expect.arrayContaining(['200', '401', '404']),
    );
    expect(ordersCollectionPath.get.security).toEqual([{ gustio_session: [] }]);

    const orderItemPath =
      document.paths['/restaurants/{restaurantId}/orders/{orderId}'];
    expect(orderItemPath).toBeDefined();

    expect(orderItemPath.get).toBeDefined();
    expect(orderItemPath.get.summary).toBe('Get order by ID');
    expect(Object.keys(orderItemPath.get.responses)).toEqual(
      expect.arrayContaining(['200', '401', '404']),
    );

    expect(orderItemPath.patch).toBeDefined();
    expect(orderItemPath.patch.summary).toBe('Update order');
    expect(orderItemPath.patch.requestBody).toBeDefined();
    expect(Object.keys(orderItemPath.patch.responses)).toEqual(
      expect.arrayContaining(['200', '400', '401', '404']),
    );

    expect(orderItemPath.delete).toBeDefined();
    expect(orderItemPath.delete.summary).toBe('Delete order');
    expect(Object.keys(orderItemPath.delete.responses)).toEqual(
      expect.arrayContaining(['200', '401', '404']),
    );
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await app.close();
  });
});
