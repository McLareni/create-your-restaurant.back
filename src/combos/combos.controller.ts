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
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CombosService } from './combos.service';
import { CreateComboDto } from './dto/create-combo.dto';
import { UpdateComboDto } from './dto/update-combo.dto';
import type { AuthenticatedRequest } from '../restaurants/middleware/session-auth.middleware';

@ApiTags('Combos')
@Controller('restaurants/:restaurantId/combos')
export class CombosController {
  constructor(private readonly combosService: CombosService) {}

  @ApiOperation({ summary: 'Get all combos for a restaurant' })
  @ApiCookieAuth('gustio_session')
  @Get()
  getAll(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.combosService.getAll(restaurantId, request.user.id);
  }

  @ApiOperation({ summary: 'Create a combo pack' })
  @ApiCookieAuth('gustio_session')
  @Post()
  create(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Body() createComboDto: CreateComboDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.combosService.create(
      restaurantId,
      createComboDto,
      request.user.id,
    );
  }

  @ApiOperation({ summary: 'Update a combo pack' })
  @ApiCookieAuth('gustio_session')
  @Patch(':id')
  update(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Param('id') id: string,
    @Body() updateComboDto: UpdateComboDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.combosService.update(
      restaurantId,
      id,
      updateComboDto,
      request.user.id,
    );
  }

  @ApiOperation({ summary: 'Delete a combo pack' })
  @ApiCookieAuth('gustio_session')
  @Delete(':id')
  delete(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.combosService.delete(restaurantId, id, request.user.id);
  }
}
