import { Body, Controller, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
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
      },
    },
  })
  @Post('verify-login-code')
  verifyLoginCode(@Body() verifyLoginCodeDto: VerifyLoginCodeDto) {
    return this.usersService.verifyLoginCode(
      verifyLoginCodeDto.email,
      verifyLoginCodeDto.code,
    );
  }
}
