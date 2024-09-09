import {Entity, PrimaryGeneratedColumn, Column, BeforeInsert, JoinTable, ManyToMany, OneToMany} from 'typeorm';
import { IsEmail } from 'class-validator';

@Entity('user')
export class UserEntity {

  @PrimaryGeneratedColumn()
  id: number;

  @Column({length:1024})
  address: string;

  @Column()
  chain: string;

  @Column({ type: 'numeric', precision: 100, scale: 32, default: 0 })
  point: number;

  @Column({ type: 'numeric', precision: 100, scale: 32, default: 0 })
  partner_coin: number;

  @Column({default: ''})
  email: string;
  
  @Column({default: ''})
  tg: string;

  @Column({default: ''})
  x: string;

  @Column({default: ''})
  password: string;

  @Column({default: false})
  finish_story_tutorial: boolean;

  @Column({default: false})
  finish_zone_page_tutorial: boolean;

  @Column({default: new Date()})
  last_login_at: Date;

  @Column({default: new Date()})
  created_at: Date;

  // @BeforeInsert()
  // async hashPassword() {
  //   this.password = await argon2.hash(this.password);
  // }

}
