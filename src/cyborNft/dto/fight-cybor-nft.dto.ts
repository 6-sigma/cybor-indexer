import { IsNotEmpty } from 'class-validator';

export class StartFightCyborNftDto {
  @IsNotEmpty()
  readonly id: number;
  
  @IsNotEmpty()
  readonly nft_id: string;

  @IsNotEmpty()
  readonly chain: string;
  
  @IsNotEmpty()
  readonly state: number; // 1: 故事副本, 2: 生存副本, 3: 冲塔副本

  readonly stateData: string;

  readonly storyId: string;

  @IsNotEmpty()
  readonly enemies: Map<number, number>; // index, level
}


export class EndFightCyborNftDto {
  @IsNotEmpty()
  readonly id: number;
  
  @IsNotEmpty()
  readonly nft_id: string;

  @IsNotEmpty()
  readonly chain: string;
  
  @IsNotEmpty()
  readonly state: number; // 0: 结束战斗

  readonly stateData: string; // “”

  readonly storyId: string; // 0

  @IsNotEmpty()
  highestDefense: number; // 最高塔

  @IsNotEmpty()
  highestSurvival: number; // 最高生存轮数
}


export class OnEnemyDieDto {
  @IsNotEmpty()
  readonly id: number;
  
  @IsNotEmpty()
  readonly nft_id: string;

  @IsNotEmpty()
  readonly chain: string;
  
  @IsNotEmpty()
  readonly enemyIndex: number; //

  @IsNotEmpty()
  readonly recoding: string; // 战斗录像
}

export class TakeDamToCyborNftDto {
  @IsNotEmpty()
  readonly id: number;
  
  @IsNotEmpty()
  readonly nft_id: string;

  @IsNotEmpty()
  readonly chain: string;
  
  @IsNotEmpty()
  readonly enemyIndex: number; //

  @IsNotEmpty()
  readonly damage: number; //
}