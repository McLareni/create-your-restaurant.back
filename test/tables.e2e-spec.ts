import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TableStatus } from '@prisma/client';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import request from 'supertest';
import { App } from 'supertest/types';
import { TablesController } from './../src/tables/tables.controller';
import { TablesService } from './../src/tables/tables.service';

describe('TablesController (e2e)', () => {
  let app: INestApplication<App>;

  const tablesServiceMock = {
    createTable: jest.fn(),
    getTables: jest.fn(),
    updateTable: jest.fn(),
    deleteTable: jest.fn(),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [TablesController],
      providers: [
        {
          provide: TablesService,
          useValue: tablesServiceMock,
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

  it('/restaurants/:restaurantId/tables (POST) should create table', async () => {
    const payload = {
      number: 12,
      status: TableStatus.ACTIVE,
      type: 'TERRACE',
    };

    tablesServiceMock.createTable.mockResolvedValue({
      message: 'Table created successfully',
      table: {
        id: 'table-1',
        restaurantId: 1,
        ...payload,
        canAcceptOrders: true,
      },
    });

    await request(app.getHttpServer())
      .post('/restaurants/1/tables')
      .send(payload)
      .expect(201)
      .expect({
        message: 'Table created successfully',
        table: {
          id: 'table-1',
          restaurantId: 1,
          ...payload,
          canAcceptOrders: true,
        },
      });

    expect(tablesServiceMock.createTable).toHaveBeenCalledWith(
      1,
      payload,
      1,
    );
  });

  it('/restaurants/:restaurantId/tables (POST) should validate payload', async () => {
    await request(app.getHttpServer())
      .post('/restaurants/1/tables')
      .send({
        number: 0,
        status: 'ACTIVE',
        type: '',
      })
      .expect(400);
  });

  it('/restaurants/:restaurantId/tables (GET) should return tables list', async () => {
    tablesServiceMock.getTables.mockResolvedValue([
      {
        id: 'table-1',
        restaurantId: 1,
        number: 12,
        status: TableStatus.ACTIVE,
        type: 'TERRACE',
        canAcceptOrders: true,
      },
    ]);

    await request(app.getHttpServer())
      .get('/restaurants/1/tables')
      .expect(200)
      .expect([
        {
          id: 'table-1',
          restaurantId: 1,
          number: 12,
          status: TableStatus.ACTIVE,
          type: 'TERRACE',
          canAcceptOrders: true,
        },
      ]);

    expect(tablesServiceMock.getTables).toHaveBeenCalledWith(1, 1);
  });

  it('/restaurants/:restaurantId/tables/:tableId (PATCH) should update table', async () => {
    const payload = {
      status: TableStatus.INACTIVE,
      type: 'BAR',
    };

    tablesServiceMock.updateTable.mockResolvedValue({
      message: 'Table updated successfully',
      table: {
        id: 'table-1',
        restaurantId: 1,
        number: 12,
        ...payload,
        canAcceptOrders: false,
      },
    });

    await request(app.getHttpServer())
      .patch('/restaurants/1/tables/table-1')
      .send(payload)
      .expect(200)
      .expect({
        message: 'Table updated successfully',
        table: {
          id: 'table-1',
          restaurantId: 1,
          number: 12,
          ...payload,
          canAcceptOrders: false,
        },
      });

    expect(tablesServiceMock.updateTable).toHaveBeenCalledWith(
      1,
      'table-1',
      payload,
      1,
    );
  });

  it('/restaurants/:restaurantId/tables/:tableId (DELETE) should delete table', async () => {
    tablesServiceMock.deleteTable.mockResolvedValue({
      message: 'Table deleted successfully',
    });

    await request(app.getHttpServer())
      .delete('/restaurants/1/tables/table-1')
      .expect(200)
      .expect({ message: 'Table deleted successfully' });

    expect(tablesServiceMock.deleteTable).toHaveBeenCalledWith(
      1,
      'table-1',
      1,
    );
  });

  it('Swagger should fully describe tables endpoints', () => {
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

    const tablesCollectionPath = document.paths['/restaurants/{restaurantId}/tables'];
    expect(tablesCollectionPath).toBeDefined();
    expect(tablesCollectionPath.post).toBeDefined();
    expect(tablesCollectionPath.post.summary).toBe('Create table');
    expect(tablesCollectionPath.post.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          in: 'path',
          name: 'restaurantId',
          required: true,
        }),
      ]),
    );
    expect(tablesCollectionPath.post.requestBody).toBeDefined();
    expect(
      tablesCollectionPath.post.requestBody.content['application/json'],
    ).toBeDefined();
    expect(Object.keys(tablesCollectionPath.post.responses)).toEqual(
      expect.arrayContaining(['201', '400', '401', '404', '409']),
    );
    expect(tablesCollectionPath.post.security).toEqual([
      { gustio_session: [] },
    ]);

    expect(tablesCollectionPath.get).toBeDefined();
    expect(tablesCollectionPath.get.summary).toBe('Get all restaurant tables');
    expect(Object.keys(tablesCollectionPath.get.responses)).toEqual(
      expect.arrayContaining(['200', '400', '401', '404']),
    );
    expect(tablesCollectionPath.get.security).toEqual([{ gustio_session: [] }]);

    const tableItemPath = document.paths['/restaurants/{restaurantId}/tables/{tableId}'];
    expect(tableItemPath).toBeDefined();
    expect(tableItemPath.patch).toBeDefined();
    expect(tableItemPath.patch.summary).toBe('Update table');
    expect(tableItemPath.patch.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ in: 'path', name: 'restaurantId' }),
        expect.objectContaining({ in: 'path', name: 'tableId' }),
      ]),
    );
    expect(tableItemPath.patch.requestBody).toBeDefined();
    expect(Object.keys(tableItemPath.patch.responses)).toEqual(
      expect.arrayContaining(['200', '400', '401', '404', '409']),
    );
    expect(tableItemPath.patch.security).toEqual([{ gustio_session: [] }]);

    expect(tableItemPath.delete).toBeDefined();
    expect(tableItemPath.delete.summary).toBe('Delete table');
    expect(Object.keys(tableItemPath.delete.responses)).toEqual(
      expect.arrayContaining(['200', '400', '401', '404']),
    );
    expect(tableItemPath.delete.security).toEqual([{ gustio_session: [] }]);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await app.close();
  });
});
