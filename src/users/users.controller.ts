import { Body, Controller, Post, Req } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { LogoutDto } from './dto/logout.dto';
import { RequestLoginCodeDto } from './dto/request-login-code.dto';
import { VerifyLoginCodeDto } from './dto/verify-login-code.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: 'Request one-time login code' })
  @ApiBody({ type: RequestLoginCodeDto })
  @ApiResponse({
    status: 201,
    description: 'Login code sent to email',
    schema: {
      example: {
        message: 'Code sent to email',
      },
    },
  })
  @Post()
  requestLoginCode(@Body() requestLoginCodeDto: RequestLoginCodeDto) {
    return this.usersService.requestLoginCode(requestLoginCodeDto.email);
  }

  @ApiOperation({ summary: 'Verify one-time login code' })
  @ApiBody({ type: VerifyLoginCodeDto })
  @ApiResponse({
    status: 201,
    description: 'Code verified successfully',
    schema: {
      example: {
        message: 'Login for user@example.com successful',
        session: {
          token: '8c3e1b06-4690-4a0b-9f4a-5c0d6a321f80',
          expiresAt: '2026-06-15T13:40:00.000Z',
        },
      },
    },
  })
  @Post('verify-login-code')
  verifyLoginCode(
    @Body() verifyLoginCodeDto: VerifyLoginCodeDto,
    @Req() request: Request,
  ) {
    const forwardedFor = request.headers['x-forwarded-for'];
    const ipAddress = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : forwardedFor?.split(',')[0]?.trim() || request.ip;

    return this.usersService.verifyLoginCode(
      verifyLoginCodeDto.email,
      verifyLoginCodeDto.code,
      {
        userAgent: request.get('user-agent') ?? undefined,
        ipAddress,
      },
    );
  }

  @ApiOperation({ summary: 'Logout' })
  @ApiBody({ type: LogoutDto })
  @ApiResponse({
    status: 200,
    description: 'Logout successful',
    schema: {
      example: {
        message: 'Logout successful',
      },
    },
  })
  @Post('logout')
  logout(@Body() logoutDto: LogoutDto) {
    return this.usersService.logout(logoutDto.token);
  }
}
