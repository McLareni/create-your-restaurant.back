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
import type { AuthenticatedRequest } from '../restaurants/middleware/session-auth.middleware';
import { CreateModifierGroupDto } from './dto/create-modifier.dto';
import { UpdateModifierGroupDto } from './dto/update-modifier.dto';
import { AttachModifierDto } from './dto/attach-modifier.dto';
import { ModifiersService } from './modifiers.service';

@ApiTags('Modifiers')
@Controller('restaurants/:restaurantId/modifiers')
export class ModifiersController {
  constructor(private readonly modifiersService: ModifiersService) {}

  @ApiOperation({ summary: 'Create modifier group' })
  @ApiCookieAuth('gustio_session')
  @Post()
  createGroup(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Body() createDto: CreateModifierGroupDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.modifiersService.createGroup(
      restaurantId,
      createDto,
      request.user.id,
    );
  }

  @ApiOperation({ summary: 'Get all modifier groups for restaurant' })
  @ApiCookieAuth('gustio_session')
  @Get()
  getGroups(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.modifiersService.getGroups(restaurantId, request.user.id);
  }

  @ApiOperation({ summary: 'Update modifier group' })
  @ApiCookieAuth('gustio_session')
  @Patch(':groupId')
  updateGroup(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Param('groupId') groupId: string,
    @Body() updateDto: UpdateModifierGroupDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.modifiersService.updateGroup(
      restaurantId,
      groupId,
      updateDto,
      request.user.id,
    );
  }

  @ApiOperation({ summary: 'Delete modifier group' })
  @ApiCookieAuth('gustio_session')
  @Delete(':groupId')
  deleteGroup(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Param('groupId') groupId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.modifiersService.deleteGroup(
      restaurantId,
      groupId,
      request.user.id,
    );
  }

  @ApiOperation({ summary: 'Attach modifier group to dish' })
  @ApiCookieAuth('gustio_session')
  @Post('dish/:dishId')
  attachToDish(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Param('dishId') dishId: string,
    @Body() attachDto: AttachModifierDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.modifiersService.attachToDish(
      restaurantId,
      dishId,
      attachDto.modifierGroupId,
      request.user.id,
    );
  }

  @ApiOperation({ summary: 'Detach modifier group from dish' })
  @ApiCookieAuth('gustio_session')
  @Delete('dish/:dishId/:modifierGroupId')
  detachFromDish(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Param('dishId') dishId: string,
    @Param('modifierGroupId') modifierGroupId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.modifiersService.detachFromDish(
      restaurantId,
      dishId,
      modifierGroupId,
      request.user.id,
    );
  }
}
