import { IsNotEmpty } from 'class-validator';

export class CreateCyborNftDto {

  @IsNotEmpty()
  readonly nft_id: string;

  @IsNotEmpty()
  readonly chain: string;

  @IsNotEmpty()
  readonly state: number;

  readonly enemiesDefeated: number;

  readonly highestDefense: number;

  readonly highestSurvival: number;
}