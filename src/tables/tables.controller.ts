import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  Get,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { TablesService } from './tables.service';
import type { AuthenticatedRequest } from '../restaurants/middleware/session-auth.middleware';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';

@ApiTags('Tables')
@Controller('restaurants/:restaurantId/tables')
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @ApiOperation({ summary: 'Get all restaurant tables' })
  @ApiCookieAuth('gustio_session')
  @Get()
  getAll(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.tablesService.getAll(restaurantId, request.user.id);
  }

  @ApiOperation({ summary: 'Create table' })
  @ApiCookieAuth('gustio_session')
  @Post()
  create(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Body() dto: CreateTableDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.tablesService.createTable(restaurantId, dto, request.user.id);
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
  @Patch(':tableId')
  update(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Param('tableId') tableId: string,
    @Body() dto: UpdateTableDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.tablesService.updateTable(
      restaurantId,
      tableId,
      dto,
      request.user.id,
    );
  }

  @ApiOperation({ summary: 'Delete a table' })
  @ApiCookieAuth('gustio_session')
  @Delete(':tableId')
  delete(
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
