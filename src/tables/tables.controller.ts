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

  @ApiOperation({ summary: 'Update a table' })
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