import { IsString, IsNotEmpty } from 'class-validator';

export class PinLoginDto {
  @IsString()
  @IsNotEmpty()
  pinCode!: string;
}

export class AuthorizeVoidDto {
  @IsString()
  @IsNotEmpty()
  pinCode!: string;

  @IsString()
  @IsNotEmpty()
  orderId!: string;
}
