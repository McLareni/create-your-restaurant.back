import { Body, Controller, Delete, Param, Patch, Post, Get, Req, ParseIntPipe } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TablesService } from './tables.service';
import type { AuthenticatedRequest } from '../restaurants/middleware/session-auth.middleware';

@ApiTags('Tables')
@Controller('restaurants/:restaurantId/tables')
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @ApiOperation({ summary: 'Get all tables for a restaurant' })
  @ApiCookieAuth('gustio_session')
  @Get()
  getAll(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.tablesService.getAll(restaurantId, request.user.id);
  }

  @ApiOperation({ summary: 'Create a table' })
  @ApiCookieAuth('gustio_session')
  @Post()
  create(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Body() dto: any,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.tablesService.create(restaurantId, dto, request.user.id);
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
  @Patch(':id')
  update(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Param('id') id: string,
    @Body() dto: any,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.tablesService.update(restaurantId, id, dto, request.user.id);
  }

  @ApiOperation({ summary: 'Delete a table' })
  @ApiCookieAuth('gustio_session')
  @Delete(':id')
  delete(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.tablesService.delete(restaurantId, id, request.user.id);
  }
}
