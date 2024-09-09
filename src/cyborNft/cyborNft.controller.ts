import { Get, Post, Controller, Inject, Req, Body, HttpException, HttpStatus } from '@nestjs/common';

import { CyborNFTEntity } from './cyborNft.entity';
import { CyborNftService } from './cyborNft.service';
import { UserService } from '../user/user.service';
import { CyborStream, Sigmaverse } from '../sigmaverse';
import { Request } from 'express';

import {
  ApiBearerAuth, ApiTags,
} from '@nestjs/swagger';
import { EndFightCyborNftDto, StartFightCyborNftDto, OnEnemyDieDto, TakeDamToCyborNftDto } from './dto';
import { Enemies } from '../enemy.config';




@ApiBearerAuth()
@ApiTags('cybor_nft')
@Controller('cybor_nft')
export class CyborNftController {

  private static cachedResultCybors: Map<string, object> | null = null;
  private static lastUpdateTime: number = 0;

  // enemies in current round
  private static fightingEnemies: Map<string, { data: Map<number, object>, timestamp: number }> = new Map();
  private static readonly TIMEOUT = 5 * 3600 * 1000; // 5 hours in milliseconds
  private static cleanupFightingEnemies() {
    const now = Date.now();
    for (const [key, value] of this.fightingEnemies) {
      if (now - value.timestamp > this.TIMEOUT || value.data.size == 0) {
        this.fightingEnemies.delete(key);
      }
    }
  }
  private static setFightingEnemies(key: string, data: Map<number, object>) {
    this.cleanupFightingEnemies();
    this.fightingEnemies.set(key, { data, timestamp: Date.now() });
  }
  private static getFightingEnemies(key: string): Map<number, object> | undefined {
    this.cleanupFightingEnemies();
    const value = this.fightingEnemies.get(key);
    value.timestamp = Date.now();
    return value ? value.data : undefined;
  }

  constructor(
    private readonly cyborNftService: CyborNftService,
    private readonly userService: UserService,
    @Inject('SigmaverseProgram') private readonly sigmaverseProgram: Sigmaverse
  ) {
  }

  private static getFightingKey(chain: string, cyborNFTID: string, address: string): string {
    return address + "_" + this.getNftKey(chain, cyborNFTID);
  }

  private static getNftKey(chain: string, cyborNFTID: string): string {
    return chain + "_" + cyborNFTID;
  }

  @Get("marketplace")
  async all(): Promise<Map<string, object>> {
    const currentTime = Date.now();
    const oneMinute = 60 * 1000; // 1分钟的毫秒数

    if (!CyborNftController.cachedResultCybors || currentTime - CyborNftController.lastUpdateTime > oneMinute) {
      const resultCybors = new Map<string, object>();

      // varanetwork cybor NFTs
      const vara_CyborNFTs = await this.sigmaverseProgram.cyborNft.allCybors();
      for (const vara_cybor of vara_CyborNFTs) {
        resultCybors.set(CyborNftController.getNftKey("varanetwork", vara_cybor[0].toString()), {"nft": vara_cybor[1]});
      }

      const allCyborDB = await this.cyborNftService.findAll();
      for (const cybor of allCyborDB) {
        const _k = CyborNftController.getNftKey(cybor.chain, cybor.nft_id);
        const _result = resultCybors.get(_k);
        if (_result) {
          _result["db"] = cybor;
        } else {
          resultCybors.set(_k, {"db": cybor});
        }
      }

      CyborNftController.cachedResultCybors = resultCybors;
      CyborNftController.lastUpdateTime = currentTime;
    }

    return CyborNftController.cachedResultCybors;
  }

  private async allMyCybors(@Req() request: Request): Promise<Map<string, {nft: CyborStream, "system-inbuilt": boolean, db: CyborNFTEntity}>> {
      const currentTime = Date.now();
      const oneHour = 30 * 1000; // 30 seconds in milliseconds

      if (!request.resultCybors || !request.next_update_mycybors_at || currentTime >= request.next_update_mycybors_at) {
        try {
          const resultCybors = new Map<string, {nft: CyborStream, "system-inbuilt": boolean, db: CyborNFTEntity}>();
          const vara_CyborNFTs = await this.sigmaverseProgram.cyborNft.allMyCybors(request.user.address);
          for (const vara_cybor of vara_CyborNFTs) {
            const _k = CyborNftController.getNftKey("varanetwork", vara_cybor[0].toString());
            resultCybors.set(_k, {"nft": vara_cybor[1], "system-inbuilt": false, db: null});

            if (vara_cybor[1].mint_at == 0) {
              resultCybors.get(_k)["system-inbuilt"] = true;
            }

            var nftID = vara_cybor[0].toString();
            let dbCybor = await this.cyborNftService.findOne(nftID, "varanetwork");

            if (!dbCybor) {
              dbCybor = await this.cyborNftService.create(
                {
                  nft_id: nftID,
                  chain: "varanetwork",
                  state: 0,
                  enemiesDefeated: 0,
                  highestDefense: 0,
                  highestSurvival: 0,
                }
              );
            }
            resultCybors.get(_k)["db"] = dbCybor;
          }

          request.resultCybors = resultCybors;
          request.next_update_mycybors_at = currentTime + oneHour;
        } catch (error) {
          console.error("Error in allMyCybors:", error);
          throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
      }

      console.log("allMyCybors::: ", request.resultCybors);
      return request.resultCybors;
}

  @Get('all_my_cybors')
  async allMyCyborsRecord(@Req() request: Request): Promise<Record<string, {
      nft: CyborStream;
      "system-inbuilt": boolean;
      db: CyborNFTEntity;
  }>> {
    const _all_my_cybors = await this.allMyCybors(request);
    
    // Convert Map to a plain object before returning
    const plainObject: Record<string, {nft: CyborStream, "system-inbuilt": boolean, db: CyborNFTEntity}> = {};
    _all_my_cybors.forEach((value, key) => {
      plainObject[key] = value;
    });
    // console.log("Returning plain object:", plainObject);
    return plainObject;
  }

  private async _reset(request: Request, chain: string, cyborNFTID: string) {
    request.HP = 0;
    request.round = 1;
    const _enemies_key = CyborNftController.getFightingKey(chain, cyborNFTID, request.user.address);
    CyborNftController.fightingEnemies.delete(_enemies_key);
  }

  @Post('resetState')
  async resetState(@Req() request: Request, @Body('startFightCyborNftDto') startFightCyborNftDto: StartFightCyborNftDto): Promise<CyborNFTEntity> {
    this._reset(request, startFightCyborNftDto.chain, startFightCyborNftDto.nft_id);
    return await this.cyborNftService.resetState(startFightCyborNftDto.id);
  }


  @Post('startFight')
  async startFight(@Req() request: Request, @Body('startFightCyborNftDto') startFightCyborNftDto: StartFightCyborNftDto): Promise<CyborNFTEntity> {
    if (startFightCyborNftDto.state != 1 && startFightCyborNftDto.state != 2 && startFightCyborNftDto.state != 3) {
      return null;
    }

    const _all_my_cybors = await this.allMyCybors(request);
    const _k = CyborNftController.getNftKey(startFightCyborNftDto.chain, startFightCyborNftDto.nft_id);
    const _result = _all_my_cybors.get(_k);
    if (!_result) {
      throw new Error('CyborNFT not found');
    }
    const db_cybor = _result["db"];
    const nft_cybor = _result["nft"];
    const is_inbuilt = _result["system-inbuilt"];

    if (!db_cybor || db_cybor.id != startFightCyborNftDto.id) {
      throw new Error('CyborNFT data error');
    }

    const _enemies_key = CyborNftController.getFightingKey(startFightCyborNftDto.chain, startFightCyborNftDto.nft_id, request.user.address);

    if (startFightCyborNftDto.state != db_cybor.state) {
      request.HP = nft_cybor.basic_hp * (nft_cybor.level / 10 + 1);
      request.round = 1;
    }

    let current_enemies = new Map<number, object>();
    for (let [index, level] of startFightCyborNftDto.enemies) {
      if (index >= 0 && index < Enemies.length && Enemies[index]) {
        level = Math.max(0, Math.min(2, level));
        let enemyConfig = Enemies[index].Data[level];
        current_enemies.set(index, { ...enemyConfig });
      }
    }

    CyborNftController.setFightingEnemies(_enemies_key, current_enemies);
  
    return await this.cyborNftService.startFight(db_cybor.id, startFightCyborNftDto);
  }

  @Post('endFightRound')
  async endFightRound(@Req() request: Request, @Body('endFightCyborNftDto') endFightCyborNftDto: EndFightCyborNftDto): Promise<CyborNFTEntity> {
    const _all_my_cybors = await this.allMyCybors(request);
    const _k = CyborNftController.getNftKey(endFightCyborNftDto.chain, endFightCyborNftDto.nft_id);
    const _result = _all_my_cybors.get(_k);
    if (!_result) {
      throw new Error('CyborNFT not found');
    }
    const db_cybor = _result["db"];
    if (!db_cybor || db_cybor.id != endFightCyborNftDto.id) {
      throw new Error('CyborNFT data error');
    }

    const _enemies_key = CyborNftController.getFightingKey(endFightCyborNftDto.chain, endFightCyborNftDto.nft_id, request.user.address);
    var current_enemies: Map<number, object>  = CyborNftController.getFightingEnemies(_enemies_key);
    for (const enemy of current_enemies) {
      if (enemy['Hp'] > 0) {
        throw new Error(`Enemy ${enemy[0]} has not been defeated`);
      }
    }

    // survival
    if (db_cybor.state == 2) {
      request.round += 1;
      if (request.round > db_cybor.highest_survival) {
        db_cybor.highest_survival = request.round;
        await this.cyborNftService.updateHighestSurvival(db_cybor.id, request.round);
      }
    } 
    // defense
    else if (db_cybor.state == 3) {
      request.round += 1;
      if (request.round > db_cybor.highest_survival) {
        db_cybor.highest_survival = request.round;
        await this.cyborNftService.updateHighestDefense(db_cybor.id, request.round);
      }
    }

    return await null;
  }

  @Post('onEnemyDie')
  async onEnemyDie(@Req() request: Request, @Body('onEnemyDieDto') onEnemyDieDto: OnEnemyDieDto): Promise<{partnerCoin: number, point: number}> {
    const _all_my_cybors = await this.allMyCybors(request);
    const _k = CyborNftController.getNftKey(onEnemyDieDto.chain, onEnemyDieDto.nft_id);
    const _result = _all_my_cybors.get(_k);
    if (!_result) {
      throw new Error('CyborNFT not found');
    }
    const db_cybor = _result["db"];
    if (!db_cybor || db_cybor.id != onEnemyDieDto.id) {
      throw new Error('CyborNFT data error');
    }

    const _enemies_key = CyborNftController.getFightingKey(onEnemyDieDto.chain, onEnemyDieDto.nft_id, request.user.address);
    var current_enemies: Map<number, object>  = CyborNftController.getFightingEnemies(_enemies_key);

    const enemy = current_enemies.get(onEnemyDieDto.enemyIndex);
    if (!enemy) {
      throw new Error(`Enemy ${onEnemyDieDto.enemyIndex} not found`);
    }

    const nft_cybor = _result["nft"];
    for (const damage of onEnemyDieDto.recoding.split(',')) {
      let _d = Number(damage);
      if (_d > nft_cybor.basic_damage * (nft_cybor.level / 10 + 1)) {
        throw new Error(`Damage ${_d} is invalid`);
      }
      enemy['Hp'] -= _d;
    }
    if (enemy['Hp'] > 0) {
      throw new Error(`Enemy Die???, No, The not, ${enemy[0]} has not been defeated!!!`);
    }

    let u = await this.userService.addPartnerCoin(request.user.id, (enemy['Score'] as number));
    u = await this.userService.addPoint(request.user.id, 1);
    this.cyborNftService.addEnemiesDefeated(db_cybor.id, 1);

    return {partnerCoin: u.partner_coin, point: u.point};
  }


  @Post('takeDamToCyborNft')
  async takeDamToCyborNft(@Req() request: Request, @Body('takeDamToCyborNftDto') takeDamToCyborNftDto: TakeDamToCyborNftDto): Promise<{hp: number}> {
    const _all_my_cybors = await this.allMyCybors(request);
    const _k = CyborNftController.getNftKey(takeDamToCyborNftDto.chain, takeDamToCyborNftDto.nft_id);
    const _result = _all_my_cybors.get(_k);
    if (!_result) {
      throw new Error('CyborNFT not found');
    }
    const db_cybor = _result["db"];
    if (!db_cybor || db_cybor.id != takeDamToCyborNftDto.id) {
      throw new Error('CyborNFT data error');
    }

    const _enemies_key = CyborNftController.getFightingKey(takeDamToCyborNftDto.chain, takeDamToCyborNftDto.nft_id, request.user.address);
    var current_enemies: Map<number, object>  = CyborNftController.getFightingEnemies(_enemies_key);

    const enemy = current_enemies.get(takeDamToCyborNftDto.enemyIndex);
    if (!enemy) {
      throw new Error(`Enemy ${takeDamToCyborNftDto.enemyIndex} not found`);
    }

    request.HP -= takeDamToCyborNftDto.damage;

    if (request.HP <= 0) {
      this._reset(request, takeDamToCyborNftDto.chain, takeDamToCyborNftDto.nft_id);
      await this.cyborNftService.resetState(db_cybor.id);
    }

    return {hp: request.HP};
  } 


}