import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';
import type { AuthenticatedRequest } from '../restaurants/middleware/session-auth.middleware';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrdersService } from './orders.service';

@ApiTags('Orders')
@Controller('restaurants/:restaurantId/orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @ApiOperation({
    summary: 'Create public dine-in order by table QR',
    description:
      'Public endpoint for guest orders from customer menu. Requires valid active tableId.',
  })
  @ApiParam({ name: 'restaurantId', type: Number, example: 1 })
  @ApiBody({
    type: CreateOrderDto,
    schema: {
      example: {
        type: 'DINE_IN',
        tableId: '1a2d7d9c-5f73-4bf0-b89a-f12474a584d3',
        items: [
          {
            dishId: 'df5b80f5-c448-4c5b-a651-6ccdc59827d2',
            quantity: 2,
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Public order created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid order payload or inactive table',
  })
  @Post('public')
  createPublicOrder(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Body() createOrderDto: CreateOrderDto,
  ) {
    return this.ordersService.createPublicOrder(restaurantId, createOrderDto);
  }

  @ApiOperation({ summary: 'Create order' })
  @ApiCookieAuth('gustio_session')
  @ApiParam({ name: 'restaurantId', type: Number, example: 1 })
  @ApiBody({
    type: CreateOrderDto,
    schema: {
      example: {
        type: 'DINE_IN',
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
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Order created successfully',
    schema: {
      example: {
        message: 'Order created successfully',
        order: {
          id: '8bca983a-8101-41da-b7dd-f3caeb343cf0',
          restaurantId: 1,
          tableId: '1a2d7d9c-5f73-4bf0-b89a-f12474a584d3',
          type: 'DINE_IN',
          status: 'PENDING',
          totalAmount: 980,
          createdAt: '2026-05-20T12:00:00.000Z',
          updatedAt: '2026-05-20T12:00:00.000Z',
          table: {
            id: '1a2d7d9c-5f73-4bf0-b89a-f12474a584d3',
            number: 12,
            type: 'TERRACE',
          },
          items: [
            {
              id: 'item-1',
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
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid order data' })
  @ApiResponse({ status: 401, description: 'Invalid or expired session token' })
  @ApiResponse({ status: 404, description: 'Restaurant not found' })
  @Post()
  createOrder(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Body() createOrderDto: CreateOrderDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.ordersService.createOrder(
      restaurantId,
      createOrderDto,
      request.user.id,
    );
  }

  @ApiOperation({ summary: 'Get restaurant orders' })
  @ApiCookieAuth('gustio_session')
  @ApiParam({ name: 'restaurantId', type: Number, example: 1 })
  @ApiQuery({
    name: 'status',
    enum: OrderStatus,
    required: false,
    description: 'Filter orders by status',
  })
  @ApiResponse({
    status: 200,
    description: 'Orders list fetched successfully',
    schema: {
      example: [
        {
          id: '8bca983a-8101-41da-b7dd-f3caeb343cf0',
          restaurantId: 1,
          tableId: '1a2d7d9c-5f73-4bf0-b89a-f12474a584d3',
          type: 'DINE_IN',
          status: 'PENDING',
          totalAmount: 980,
          items: [
            {
              id: 'item-1',
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
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired session token' })
  @ApiResponse({ status: 404, description: 'Restaurant not found' })
  @Get()
  getOrders(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Req() request: AuthenticatedRequest,
    @Query('status', new ParseEnumPipe(OrderStatus, { optional: true }))
    status?: OrderStatus,
  ) {
    return this.ordersService.getOrders(restaurantId, request.user.id, status);
  }

  @ApiOperation({ summary: 'Get order by ID' })
  @ApiCookieAuth('gustio_session')
  @ApiParam({ name: 'restaurantId', type: Number, example: 1 })
  @ApiParam({
    name: 'orderId',
    type: String,
    example: '8bca983a-8101-41da-b7dd-f3caeb343cf0',
  })
  @ApiResponse({
    status: 200,
    description: 'Order fetched successfully',
    schema: {
      example: {
        id: '8bca983a-8101-41da-b7dd-f3caeb343cf0',
        restaurantId: 1,
        tableId: '1a2d7d9c-5f73-4bf0-b89a-f12474a584d3',
        type: 'DINE_IN',
        status: 'PENDING',
        totalAmount: 980,
        items: [
          {
            id: 'item-1',
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
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired session token' })
  @ApiResponse({ status: 404, description: 'Restaurant or order not found' })
  @Get(':orderId')
  getOrderById(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Param('orderId') orderId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.ordersService.getOrderById(
      restaurantId,
      orderId,
      request.user.id,
    );
  }

  @ApiOperation({ summary: 'Update order' })
  @ApiCookieAuth('gustio_session')
  @ApiParam({ name: 'restaurantId', type: Number, example: 1 })
  @ApiParam({
    name: 'orderId',
    type: String,
    example: '8bca983a-8101-41da-b7dd-f3caeb343cf0',
  })
  @ApiBody({
    type: UpdateOrderDto,
    schema: {
      example: {
        status: 'IN_PROGRESS',
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Order updated successfully',
    schema: {
      example: {
        message: 'Order updated successfully',
        order: {
          id: '8bca983a-8101-41da-b7dd-f3caeb343cf0',
          status: 'IN_PROGRESS',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid update data' })
  @ApiResponse({ status: 401, description: 'Invalid or expired session token' })
  @ApiResponse({ status: 404, description: 'Restaurant or order not found' })
  @Patch(':orderId')
  updateOrder(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Param('orderId') orderId: string,
    @Body() updateOrderDto: UpdateOrderDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.ordersService.updateOrder(
      restaurantId,
      orderId,
      updateOrderDto,
      request.user.id,
    );
  }

  @ApiOperation({ summary: 'Delete order' })
  @ApiCookieAuth('gustio_session')
  @ApiParam({ name: 'restaurantId', type: Number, example: 1 })
  @ApiParam({
    name: 'orderId',
    type: String,
    example: '8bca983a-8101-41da-b7dd-f3caeb343cf0',
  })
  @ApiResponse({ status: 200, description: 'Order deleted successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or expired session token' })
  @ApiResponse({ status: 404, description: 'Restaurant or order not found' })
  @Delete(':orderId')
  deleteOrder(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Param('orderId') orderId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.ordersService.deleteOrder(
      restaurantId,
      orderId,
      request.user.id,
    );
  }
}
