import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { RequestLoginCodeDto } from 'src/users/dto/request-login-code.dto';
import { VerifyLoginCodeDto } from 'src/users/dto/verify-login-code.dto';
import { UsersService } from 'src/users/users.service';
import { SessionAuthGuard } from 'src/guards/session-auth.guard';
import { SessionToken } from 'src/users/decorators/current-user.decorator';

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

    if (result.session?.token) {
      response.cookie('gustio_session', result.session.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });
    }

    return {
      message: result.message,
      expiresAt: result.session.expiresAt,
      session: result.session,
    };
  }

  @ApiOperation({ summary: 'auth.logout_summary' })
  @ApiCookieAuth('gustio_session')
  @UseGuards(SessionAuthGuard)
  @HttpCode(200)
  @Post('logout')
  async logout(
    @SessionToken() token: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.usersService.logout(token);
    response.clearCookie('gustio_session', { path: '/' });
    return result;
  }

  @ApiOperation({ summary: 'auth.get_me_summary' })
  @ApiCookieAuth('gustio_session')
  @UseGuards(SessionAuthGuard)
  @Get('me')
  me(@SessionToken() token: string) {
    return this.usersService.getMe(token);
  }
}
