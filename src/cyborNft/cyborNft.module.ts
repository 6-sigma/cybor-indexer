import {MiddlewareConsumer, Module, NestModule, RequestMethod} from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from '../user/user.module';
import { CyborNftService } from './cyborNft.service';
import { CyborNFTEntity } from './cyborNft.entity';
import { CyborNftController } from './cyborNft.controller';
import { AuthMiddleware } from '../user/auth.middleware';

@Module({
  imports: [TypeOrmModule.forFeature([CyborNFTEntity]), UserModule],
  providers: [CyborNftService],
  controllers: [
    CyborNftController
  ],
  exports: []
})
export class CyborNftModule implements NestModule {
  public configure(consumer: MiddlewareConsumer) {
    consumer
    .apply(AuthMiddleware)
    .forRoutes(
      {path: 'cybor_nft/*', method: RequestMethod.GET},
      {path: 'cybor_nft/*', method: RequestMethod.PUT},
      {path: 'cybor_nft/*', method: RequestMethod.POST},
    );
  }
}
