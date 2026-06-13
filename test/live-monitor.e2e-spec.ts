import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TableStatus, OrderStatus, OrderType } from '@prisma/client';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import request from 'supertest';
import { App } from 'supertest/types';
import { LiveMonitorGateway } from './../src/live-monitor/live-monitor.gateway';
import { LiveMonitorController } from './../src/live-monitor/live-monitor.controller';
import { LiveMonitorService } from './../src/live-monitor/live-monitor.service';

describe('LiveMonitorController (e2e)', () => {
  let app: INestApplication<App>;

  const liveMonitorServiceMock = {
    getTablesWithActiveOrders: jest.fn(),
    resolveWaiterCall: jest.fn(),
  };

  const liveMonitorGatewayMock = {
    emitOrdersChanged: jest.fn(),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [LiveMonitorController],
      providers: [
        {
          provide: LiveMonitorService,
          useValue: liveMonitorServiceMock,
        },
        {
          provide: LiveMonitorGateway,
          useValue: liveMonitorGatewayMock,
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

  it('/restaurants/:restaurantId/live-monitor/tables (GET) should return active tables with active orders', async () => {
    liveMonitorServiceMock.getTablesWithActiveOrders.mockResolvedValue({
      restaurantId: 1,
      generatedAt: '2026-06-04T10:00:00.000Z',
      tables: [
        {
          id: 'table-1',
          number: 4,
          type: 'HALL',
          status: TableStatus.ACTIVE,
          zone: {
            id: 'zone-1',
            name: 'Main hall',
          },
          activeOrderCount: 1,
          activeOrdersTotalAmount: 520,
          activeOrders: [
            {
              id: 'order-1',
              type: OrderType.DINE_IN,
              status: OrderStatus.IN_PROGRESS,
              totalAmount: 520,
              createdAt: '2026-06-04T09:59:00.000Z',
              updatedAt: '2026-06-04T10:00:00.000Z',
              items: [
                {
                  id: 'item-1',
                  dishId: 'dish-1',
                  dishName: 'Burger',
                  quantity: 2,
                  unitPrice: 260,
                  lineTotal: 520,
                },
              ],
            },
          ],
        },
      ],
    });

    await request(app.getHttpServer())
      .get('/restaurants/1/live-monitor/tables')
      .expect(200)
      .expect((response) => {
        expect(response.body.restaurantId).toBe(1);
        expect(response.body.tables).toHaveLength(1);
        expect(response.body.tables[0].status).toBe('ACTIVE');
        expect(response.body.tables[0].activeOrderCount).toBe(1);
        expect(response.body.tables[0].activeOrders[0].status).toBe(
          'IN_PROGRESS',
        );
      });

    expect(
      liveMonitorServiceMock.getTablesWithActiveOrders,
    ).toHaveBeenCalledWith(1, 1);
  });

  it('/restaurants/:restaurantId/live-monitor/tables (GET) should validate restaurantId', async () => {
    await request(app.getHttpServer())
      .get('/restaurants/not-number/live-monitor/tables')
      .expect(400);
  });

  it('/restaurants/:restaurantId/live-monitor/tables/:tableId/waiter-call/resolve (PATCH) should resolve waiter call', async () => {
    liveMonitorServiceMock.resolveWaiterCall.mockResolvedValue({
      message: 'Waiter call resolved successfully',
      tableId: 'table-1',
    });

    await request(app.getHttpServer())
      .patch('/restaurants/1/live-monitor/tables/table-1/waiter-call/resolve')
      .expect(200)
      .expect({
        message: 'Waiter call resolved successfully',
        tableId: 'table-1',
      });

    expect(liveMonitorServiceMock.resolveWaiterCall).toHaveBeenCalledWith(
      1,
      'table-1',
      1,
    );
    expect(liveMonitorGatewayMock.emitOrdersChanged).toHaveBeenCalledWith(
      1,
      'updated',
      'table-1',
    );
  });

  it('Swagger should describe live-monitor endpoint', () => {
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
    const liveMonitorPath =
      document.paths['/restaurants/{restaurantId}/live-monitor/tables'];

    expect(liveMonitorPath).toBeDefined();
    expect(liveMonitorPath.get).toBeDefined();
    expect(liveMonitorPath.get!.summary).toBe(
      'Get all tables with active orders for live monitor',
    );
    expect(liveMonitorPath.get!.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ in: 'path', name: 'restaurantId' }),
      ]),
    );
    expect(Object.keys(liveMonitorPath.get!.responses)).toEqual(
      expect.arrayContaining(['200']),
    );
    expect(liveMonitorPath.get!.security).toEqual([{ gustio_session: [] }]);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await app.close();
  });
});
