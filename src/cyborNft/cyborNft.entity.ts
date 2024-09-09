import { Entity, PrimaryGeneratedColumn, Column, Unique } from 'typeorm';

@Entity('cybor_nft')
@Unique(['chain', 'nft_id'])
export class CyborNFTEntity {

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  chain: string;

  @Column()
  nft_id: string;

  @Column()
  state: number; // 0: 一般, 1: 故事副本, 2: 生存副本, 3: 冲塔副本

  @Column({default: ''})
  state_data: string; // 附加数据

  @Column()
  enemies_defeated: number;

  @Column()
  highest_defense: number; // 最高塔

  @Column()
  highest_survival: number; // 最高生存轮数

}
