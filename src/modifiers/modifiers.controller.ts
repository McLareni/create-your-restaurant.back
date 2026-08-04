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
import { CreateModifierGroupDto } from 'src/modifiers/dto/create-modifier.dto';
import { UpdateModifierGroupDto } from 'src/modifiers/dto/update-modifier.dto';
import { ModifiersService } from 'src/modifiers/modifiers.service';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { RequirePermission } from 'src/guards/permission.decorator';
import { ActiveRestaurantId } from 'src/common/decorators/active-restaurant-id.decorator';
import { PERMISSIONS } from 'src/common/constants/permissions.constants';

@ApiTags('Modifiers')
@ApiHeader({ name: 'x-restaurant-id', required: true })
@Controller('modifiers')
@UseGuards(PermissionsGuard)
export class ModifiersController {
  constructor(private readonly modifiersService: ModifiersService) {}

  @ApiOperation({ summary: 'api.modifiers.create_group' })
  @ApiCookieAuth('gustio_session')
  @RequirePermission(PERMISSIONS.MENU_CREATE)
  @Post()
  createGroup(
    @ActiveRestaurantId() restaurantId: number,
    @Body() createDto: CreateModifierGroupDto,
  ) {
    return this.modifiersService.createGroup(restaurantId, createDto);
  }

  @ApiOperation({ summary: 'api.modifiers.get_groups' })
  @ApiCookieAuth('gustio_session')
  @RequirePermission(PERMISSIONS.MENU_READ)
  @Get()
  getGroups(@ActiveRestaurantId() restaurantId: number) {
    return this.modifiersService.getGroups(restaurantId);
  }

  @ApiOperation({ summary: 'api.modifiers.update_group' })
  @ApiCookieAuth('gustio_session')
  @RequirePermission(PERMISSIONS.MENU_UPDATE)
  @Patch(':groupId')
  updateGroup(
    @ActiveRestaurantId() restaurantId: number,
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Body() updateDto: UpdateModifierGroupDto,
  ) {
    return this.modifiersService.updateGroup(restaurantId, groupId, updateDto);
  }

  @ApiOperation({ summary: 'api.modifiers.delete_group' })
  @ApiCookieAuth('gustio_session')
  @RequirePermission(PERMISSIONS.MENU_DELETE)
  @Delete(':groupId')
  deleteGroup(
    @ActiveRestaurantId() restaurantId: number,
    @Param('groupId', ParseUUIDPipe) groupId: string,
  ) {
    return this.modifiersService.deleteGroup(restaurantId, groupId);
  }
}
