import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { TablesService } from 'src/tables/tables.service';
import { CreateTableDto } from 'src/tables/dto/create-table.dto';
import { UpdateTableDto } from 'src/tables/dto/update-table.dto';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { RequirePermission } from 'src/guards/permission.decorator';
import { PERMISSIONS } from 'src/common/constants/permissions.constants';
import { SessionAuthGuard } from 'src/guards/session-auth.guard';

@Controller('restaurants/:restaurantId/dining-table')
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Post()
  @UseGuards(SessionAuthGuard, PermissionsGuard)
  @RequirePermission(PERMISSIONS.TABLES_MANAGE)
  create(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Body() createTableDto: CreateTableDto,
  ) {
    return this.tablesService.create(restaurantId, createTableDto);
  }

  @Get()
  @UseGuards(SessionAuthGuard, PermissionsGuard)
  @RequirePermission(PERMISSIONS.TABLES_READ)
  findAll(@Param('restaurantId', ParseIntPipe) restaurantId: number) {
    return this.tablesService.findAll(restaurantId);
  }

  @Patch(':id')
  @UseGuards(SessionAuthGuard, PermissionsGuard)
  @RequirePermission(PERMISSIONS.TABLES_MANAGE)
  update(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Param('id') id: string,
    @Body() updateTableDto: UpdateTableDto,
  ) {
    return this.tablesService.update(restaurantId, id, updateTableDto);
  }

  @Delete(':id')
  @UseGuards(SessionAuthGuard, PermissionsGuard)
  @RequirePermission(PERMISSIONS.TABLES_MANAGE)
  remove(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Param('id') id: string,
  ) {
    return this.tablesService.delete(restaurantId, id);
  }

  @Get(':id/exists')
  checkTableExists(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Param('id') id: string,
  ) {
    return this.tablesService.checkPublicTableExists(restaurantId, id);
  }
}
