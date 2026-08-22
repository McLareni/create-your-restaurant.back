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
import { SessionAuthGuard } from 'src/guards/session-auth.guard';
import { RequirePermission } from 'src/guards/permission.decorator';
import { CurrentUser } from 'src/users/decorators/current-user.decorator';
import type { User } from '@prisma/client';
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

  @ApiOperation({ summary: 'Mock public card payment for an order' })
  @Post('public/tables/:tableId/:orderId/pay')
  payPublicOrder(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Param('tableId') tableId: string,
    @Param('orderId') orderId: string,
  ) {
    return this.ordersService.payPublicOrder(restaurantId, tableId, orderId);
  }

  @ApiOperation({ summary: 'Create order' })
  @ApiCookieAuth('gustio_session')
  @UseGuards(SessionAuthGuard, PermissionsGuard)
  @RequirePermission(PERMISSIONS.ORDERS_MANAGE)
  @Post()
  createOrder(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Body() createOrderDto: CreateOrderDto,
  ) {
    return this.ordersService.createOrder(restaurantId, createOrderDto);
  }

  @ApiOperation({ summary: 'Get restaurant orders' })
  @ApiCookieAuth('gustio_session')
  @UseGuards(SessionAuthGuard, PermissionsGuard)
  @RequirePermission(PERMISSIONS.ORDERS_READ)
  @Get()
  getOrders(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @CurrentUser() user: User,
    @Query('status', new ParseEnumPipe(OrderStatus, { optional: true }))
    status?: OrderStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = Math.max(1, parseInt(page || '1', 10) || 1);
    const limitNum = Math.min(
      100,
      Math.max(1, parseInt(limit || '50', 10) || 50),
    );
    return this.ordersService.getOrders(
      restaurantId,
      user.id,
      status,
      pageNum,
      limitNum,
    );
  }

  @ApiOperation({ summary: 'Get order by ID' })
  @ApiCookieAuth('gustio_session')
  @UseGuards(SessionAuthGuard, PermissionsGuard)
  @RequirePermission(PERMISSIONS.ORDERS_READ)
  @Get(':orderId')
  getOrderById(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Param('orderId') orderId: string,
  ) {
    return this.ordersService.getOrderById(restaurantId, orderId);
  }

  @ApiOperation({ summary: 'Update order' })
  @ApiCookieAuth('gustio_session')
  @UseGuards(SessionAuthGuard, PermissionsGuard)
  @RequirePermission(PERMISSIONS.ORDERS_MANAGE)
  @Patch(':orderId')
  updateOrder(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Param('orderId') orderId: string,
    @Body() updateOrderDto: UpdateOrderDto,
    @CurrentUser() user: User,
  ) {
    return this.ordersService.updateOrder(
      restaurantId,
      orderId,
      updateOrderDto,
      user.id,
    );
  }

  @ApiOperation({ summary: 'Delete order' })
  @ApiCookieAuth('gustio_session')
  @UseGuards(SessionAuthGuard, PermissionsGuard)
  @RequirePermission(PERMISSIONS.ORDERS_MANAGE)
  @Delete(':orderId')
  deleteOrder(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Param('orderId') orderId: string,
  ) {
    return this.ordersService.deleteOrder(restaurantId, orderId);
  }
}
