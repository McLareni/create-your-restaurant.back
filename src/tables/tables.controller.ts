import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { TableStatus } from '@prisma/client';
import type { AuthenticatedRequest } from '../restaurants/middleware/session-auth.middleware';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { TablesService } from './tables.service';

@ApiTags('Tables')
@Controller('restaurants/:restaurantId/tables')
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @ApiOperation({ summary: 'Create table' })
  @ApiCookieAuth('gustio_session')
  @ApiParam({ name: 'restaurantId', type: Number, example: 1 })
  @ApiBody({ type: CreateTableDto })
  @ApiResponse({
    status: 201,
    description: 'Table created successfully',
    schema: {
      example: {
        message: 'Table created successfully',
        table: {
          id: 'a3b9a7a8-65f4-4fa6-b5b9-fce8408f2f9a',
          restaurantId: 1,
          number: 12,
          status: TableStatus.ACTIVE,
          type: 'TERRACE',
          canAcceptOrders: true,
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Session token is required' })
  @ApiResponse({ status: 401, description: 'Invalid or expired session token' })
  @ApiResponse({ status: 404, description: 'Restaurant not found' })
  @ApiResponse({
    status: 409,
    description: 'Table number already exists for this restaurant',
  })
  @Post()
  createTable(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Body() createTableDto: CreateTableDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.tablesService.createTable(
      restaurantId,
      createTableDto,
      request.user.id,
    );
  }

  @ApiOperation({ summary: 'Get all restaurant tables' })
  @ApiCookieAuth('gustio_session')
  @ApiParam({ name: 'restaurantId', type: Number, example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Tables list fetched successfully',
    schema: {
      example: [
        {
          id: 'a3b9a7a8-65f4-4fa6-b5b9-fce8408f2f9a',
          restaurantId: 1,
          number: 12,
          status: TableStatus.ACTIVE,
          type: 'TERRACE',
          canAcceptOrders: true,
        },
      ],
    },
  })
  @ApiResponse({ status: 400, description: 'Session token is required' })
  @ApiResponse({ status: 401, description: 'Invalid or expired session token' })
  @ApiResponse({ status: 404, description: 'Restaurant not found' })
  @Get()
  getTables(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.tablesService.getTables(restaurantId, request.user.id);
  }

  @ApiOperation({
    summary: 'Check if table exists by restaurant and table id',
    description:
      'Public endpoint. Returns table existence for provided restaurantId and tableId.',
  })
  @ApiParam({ name: 'restaurantId', type: Number, example: 1 })
  @ApiParam({
    name: 'tableId',
    type: String,
    example: 'a3b9a7a8-65f4-4fa6-b5b9-fce8408f2f9a',
  })
  @ApiResponse({
    status: 200,
    description: 'Table existence check result',
    schema: {
      example: {
        exists: true,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed (invalid restaurantId)',
  })
  @Get(':tableId/exists')
  checkTableExists(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Param('tableId') tableId: string,
  ) {
    return this.tablesService.checkTableExists(restaurantId, tableId);
  }

  @ApiOperation({ summary: 'Update table' })
  @ApiCookieAuth('gustio_session')
  @ApiParam({ name: 'restaurantId', type: Number, example: 1 })
  @ApiParam({
    name: 'tableId',
    type: String,
    example: 'a3b9a7a8-65f4-4fa6-b5b9-fce8408f2f9a',
  })
  @ApiBody({ type: UpdateTableDto })
  @ApiResponse({ status: 200, description: 'Table updated successfully' })
  @ApiResponse({ status: 400, description: 'Session token is required' })
  @ApiResponse({ status: 401, description: 'Invalid or expired session token' })
  @ApiResponse({ status: 404, description: 'Restaurant or table not found' })
  @ApiResponse({
    status: 409,
    description: 'Table number already exists for this restaurant',
  })
  @Patch(':tableId')
  updateTable(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Param('tableId') tableId: string,
    @Body() updateTableDto: UpdateTableDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.tablesService.updateTable(
      restaurantId,
      tableId,
      updateTableDto,
      request.user.id,
    );
  }

  @ApiOperation({ summary: 'Delete table' })
  @ApiCookieAuth('gustio_session')
  @ApiParam({ name: 'restaurantId', type: Number, example: 1 })
  @ApiParam({
    name: 'tableId',
    type: String,
    example: 'a3b9a7a8-65f4-4fa6-b5b9-fce8408f2f9a',
  })
  @ApiResponse({ status: 200, description: 'Table deleted successfully' })
  @ApiResponse({ status: 400, description: 'Session token is required' })
  @ApiResponse({ status: 401, description: 'Invalid or expired session token' })
  @ApiResponse({ status: 404, description: 'Restaurant or table not found' })
  @Delete(':tableId')
  deleteTable(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Param('tableId') tableId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.tablesService.deleteTable(
      restaurantId,
      tableId,
      request.user.id,
    );
  }
}
