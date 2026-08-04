import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CombosService } from 'src/combos/combos.service';
import { CreateComboDto } from 'src/combos/dto/create-combo.dto';
import { UpdateComboDto } from 'src/combos/dto/update-combo.dto';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { RequirePermission } from 'src/guards/permission.decorator';
import { ActiveRestaurantId } from 'src/common/decorators/active-restaurant-id.decorator';
import { PERMISSIONS } from 'src/common/constants/permissions.constants';

@ApiTags('Combos')
@ApiHeader({ name: 'x-restaurant-id', required: true })
@Controller('combos')
@UseGuards(PermissionsGuard)
export class CombosController {
  constructor(private readonly combosService: CombosService) {}

  @ApiOperation({ summary: 'api.combos.get_all' })
  @ApiCookieAuth('gustio_session')
  @RequirePermission(PERMISSIONS.MENU_READ)
  @Get()
  getAll(@ActiveRestaurantId() restaurantId: number) {
    return this.combosService.getAll(restaurantId);
  }

  @ApiOperation({ summary: 'api.combos.create' })
  @ApiCookieAuth('gustio_session')
  @RequirePermission(PERMISSIONS.MENU_CREATE)
  @Post()
  create(
    @ActiveRestaurantId() restaurantId: number,
    @Body() createComboDto: CreateComboDto,
  ) {
    return this.combosService.create(restaurantId, createComboDto);
  }

  @ApiOperation({ summary: 'api.combos.update' })
  @ApiCookieAuth('gustio_session')
  @RequirePermission(PERMISSIONS.MENU_UPDATE)
  @Patch(':id')
  update(
    @ActiveRestaurantId() restaurantId: number,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateComboDto: UpdateComboDto,
  ) {
    return this.combosService.update(restaurantId, id, updateComboDto);
  }

  @ApiOperation({ summary: 'api.combos.delete' })
  @ApiCookieAuth('gustio_session')
  @RequirePermission(PERMISSIONS.MENU_DELETE)
  @Delete(':id')
  delete(
    @ActiveRestaurantId() restaurantId: number,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.combosService.delete(restaurantId, id);
  }
}
