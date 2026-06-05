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
import { TablesService } from './tables.service';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import type { AuthenticatedRequest } from '../restaurants/middleware/session-auth.middleware';

@Controller('restaurants/:restaurantId/dining-table')
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Post()
  create(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Body() createTableDto: CreateTableDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.tablesService.create(
      restaurantId,
      createTableDto,
      request.user.id,
    );
  }

  @Get()
  findAll(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.tablesService.findAll(restaurantId, request.user.id);
  }

  @Patch(':id')
  update(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Param('id') id: string,
    @Body() updateTableDto: UpdateTableDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.tablesService.update(
      restaurantId,
      id,
      updateTableDto,
      request.user.id,
    );
  }

  @Delete(':id')
  remove(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.tablesService.delete(restaurantId, id, request.user.id);
  }

  @Get(':id/exists')
  checkTableExists(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Param('id') id: string,
  ) {
    return this.tablesService.checkPublicTableExists(restaurantId, id);
  }
}
