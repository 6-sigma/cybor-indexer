import { Get, Post, Body, Put, Controller, UsePipes, Req } from '@nestjs/common';
import { UserService } from './user.service';
import { UserRO } from './user.interface';
import { UpdateUserDto, LoginUserDto } from './dto';
import { HttpException } from '@nestjs/common/exceptions/http.exception';
import { User } from './user.decorator';
import { ValidationPipe } from '../shared/pipes/validation.pipe';
import { signatureVerify } from '@polkadot/util-crypto';
import { ApiBody } from '@nestjs/swagger';
import { Request } from 'express';

import {
  ApiBearerAuth, ApiTags
} from '@nestjs/swagger';

@ApiBearerAuth()
@ApiTags('user')
@Controller()
export class UserController {

  constructor(private readonly userService: UserService) {}

  @Get('user')
  async find(@User('address') address: string, @User('chain') chain: string): Promise<UserRO> {
    return await this.userService.findByAddressAndChain(address, chain);
  }

  @Get('info')
  async me(@Req() request: Request): Promise<number> {
    return request.user.partner_coin;
  }

  @Post('add-partner-coin')
  async addPartnerCoin(@Req() request: Request, @Body() body: {amount: number}): Promise<number> {
    // var user = await this.userService.addPartnerCoin(request.user.id, body.amount || 1);
    var user = await this.userService.addPartnerCoin(request.user.id, body.amount || 1);
    return user.partner_coin;
  }

  // @Put('user')
  // async update(@User('id') userId: number, @Body('user') userData: UpdateUserDto) {
  //   return await this.userService.update(userId, userData);
  // }

  @UsePipes(new ValidationPipe())
  @Post('users/login')
  @ApiBody({ type: LoginUserDto })
  async login(@Body() loginUserDto: LoginUserDto): Promise<object> {
    try {
      const { isValid } = signatureVerify("6sigmaverse:cyborgame", loginUserDto.signature, loginUserDto.address);

      if (!isValid) {
        throw new HttpException({errors: 'Invalid signature'}, 401);
      }
    } catch (error) {
      console.log("error::::::: ", error);
      // throw new HttpException({errors: error.message}, 401);
    }

    // insert first anyway
    await this.userService.create({address: loginUserDto.address, chain: loginUserDto.chain, email: '', x: '', tg: ''});

    const _user = await this.userService.findOne(loginUserDto);
    await this.userService.updateLastLoginAt(_user.id);
    
    const errors = {User: ' not found'};
    if (!_user) throw new HttpException({errors}, 401);

    const token = await this.userService.generateJWT(_user);
    const {email, address, chain} = _user;
    const user = {email, token, address, chain, partnerCoin: _user.partner_coin};
    return user;
  }
}
