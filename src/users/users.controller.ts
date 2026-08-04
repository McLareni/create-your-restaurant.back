import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiBody, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { LogoutDto } from 'src/users/dto/logout.dto';
import { RequestLoginCodeDto } from 'src/users/dto/request-login-code.dto';
import { VerifyLoginCodeDto } from 'src/users/dto/verify-login-code.dto';
import { UsersService } from 'src/users/users.service';
import type { AuthenticatedRequest } from 'src/restaurants/middleware/session-auth.middleware';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: 'auth.request_code_summary' })
  @ApiBody({ type: RequestLoginCodeDto })
  @Post()
  requestLoginCode(@Body() requestLoginCodeDto: RequestLoginCodeDto) {
    return this.usersService.requestLoginCode(requestLoginCodeDto.email);
  }

  @ApiOperation({ summary: 'auth.verify_code_summary' })
  @ApiBody({ type: VerifyLoginCodeDto })
  @Post('verify-login-code')
  async verifyLoginCode(
    @Body() verifyLoginCodeDto: VerifyLoginCodeDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const forwardedFor = request.headers['x-forwarded-for'];
    const ipAddress = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : forwardedFor?.split(',')[0]?.trim() || request.ip;

    const result = await this.usersService.verifyLoginCode(
      verifyLoginCodeDto.email,
      verifyLoginCodeDto.code,
      {
        userAgent: request.get('user-agent') ?? undefined,
        ipAddress,
      },
    );

    if (result?.session?.token) {
      response.cookie('gustio_session', result.session.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });
    }

    return result;
  }

  @ApiOperation({ summary: 'auth.logout_summary' })
  @ApiBody({ type: LogoutDto })
  @HttpCode(200)
  @Post('logout')
  logout(@Body() logoutDto: LogoutDto) {
    return this.usersService.logout(logoutDto.token);
  }

  @ApiOperation({ summary: 'auth.get_me_summary' })
  @ApiCookieAuth('gustio_session')
  @Get('me')
  me(@Req() request: AuthenticatedRequest) {
    const token = (request.cookies as Record<string, string> | undefined)
      ?.gustio_session;

    return this.usersService.getMe(token!);
  }
}
