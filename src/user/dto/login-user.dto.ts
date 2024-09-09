import { IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';


export class LoginUserDto {

  @ApiProperty()
  @IsNotEmpty()
  address: string;

  @ApiProperty()
  @IsNotEmpty()
  chain: string;

  @ApiProperty()
  @IsNotEmpty()
  signature: string;
}