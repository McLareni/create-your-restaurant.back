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
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';
import { OrdersService } from 'src/orders/orders.service';
import { CreateOrderDto } from 'src/orders/dto/create-order.dto';
import { AppendOrderItemsDto } from 'src/orders/dto/append-order-items.dto';
import { UpdateOrderDto } from 'src/orders/dto/update-order.dto';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { RequirePermission } from 'src/guards/permission.decorator';
import type { AuthenticatedRequest } from 'src/restaurants/middleware/session-auth.middleware';
import { PERMISSIONS } from 'src/common/constants/permissions.constants';

@ApiTags('Orders')
@Controller('restaurants/:restaurantId/orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @ApiOperation({ summary: 'Create public dine-in order by table QR' })
  @ApiParam({ name: 'restaurantId', type: Number, example: 1 })
  @Post('public')
  createPublicOrder(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Body() createOrderDto: CreateOrderDto,
  ) {
    return this.ordersService.createPublicOrder(restaurantId, createOrderDto);
  }

  @ApiOperation({ summary: 'Append items to existing public order' })
  @Post('public/:orderId/items')
  appendItemsToPublicOrder(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Param('orderId') orderId: string,
    @Body() appendOrderItemsDto: AppendOrderItemsDto,
  ) {
    return this.ordersService.appendItemsToPublicOrder(
      restaurantId,
      orderId,
      appendOrderItemsDto,
    );
  }

  @ApiOperation({ summary: 'Call waiter from public table menu' })
  @Post('public/tables/:tableId/call-waiter')
  callWaiterFromPublicMenu(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Param('tableId') tableId: string,
  ) {
    return this.ordersService.callWaiterFromPublicMenu(restaurantId, tableId);
  }

  @ApiOperation({ summary: 'Find public order by short code' })
  @Get('public/tables/:tableId/by-code/:code')
  findPublicOrderByCode(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Param('tableId') tableId: string,
    @Param('code') code: string,
  ) {
    return this.ordersService.findPublicOrderByCode(
      restaurantId,
      tableId,
      code,
    );
  }

  @ApiOperation({ summary: 'Get public order details by id' })
  @Get('public/tables/:tableId/:orderId')
  getPublicOrderById(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Param('tableId') tableId: string,
    @Param('orderId') orderId: string,
  ) {
    return this.ordersService.getPublicOrderById(
      restaurantId,
      tableId,
      orderId,
    );
  }

  @ApiOperation({ summary: 'Create order' })
  @ApiCookieAuth('gustio_session')
  @UseGuards(PermissionsGuard)
  @RequirePermission(PERMISSIONS.ORDERS_MANAGE)
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
  @UseGuards(PermissionsGuard)
  @RequirePermission(PERMISSIONS.ORDERS_READ)
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
  @UseGuards(PermissionsGuard)
  @RequirePermission(PERMISSIONS.ORDERS_READ)
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
  @UseGuards(PermissionsGuard)
  @RequirePermission(PERMISSIONS.ORDERS_MANAGE)
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
  @UseGuards(PermissionsGuard)
  @RequirePermission(PERMISSIONS.ORDERS_MANAGE)
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
