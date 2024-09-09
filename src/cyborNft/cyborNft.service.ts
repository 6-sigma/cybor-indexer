import { Injectable} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, getRepository } from 'typeorm';
import { CyborNFTEntity } from './cyborNft.entity';
import { CreateCyborNftDto, StartFightCyborNftDto } from './dto';


@Injectable()
export class CyborNftService {
  constructor(
    @InjectRepository(CyborNFTEntity)
    private readonly cyborNftRepository: Repository<CyborNFTEntity>
  ) {}

  async findAll(): Promise<CyborNFTEntity[]> {
    return await this.cyborNftRepository.find();
  }

  async startFight(id: number, dto: StartFightCyborNftDto): Promise<CyborNFTEntity> {
    return await this.cyborNftRepository.manager.transaction(async transactionalEntityManager => {
      let toUpdate = await transactionalEntityManager.findOne(CyborNFTEntity, id);
      if (!toUpdate) {
        throw new Error('CyborNFT not found');
      }
      let updated = Object.assign(toUpdate, dto);
      return await transactionalEntityManager.save(CyborNFTEntity, updated);
    });
  }

  async resetState(id: number): Promise<CyborNFTEntity> {
    return await this.cyborNftRepository.manager.transaction(async transactionalEntityManager => {
      let toUpdate = await transactionalEntityManager.findOne(CyborNFTEntity, id);
      if (!toUpdate) {
        throw new Error('CyborNFT not found');
      }
      toUpdate.state = 0;
      toUpdate.state_data = "";
      return await transactionalEntityManager.save(CyborNFTEntity, toUpdate); 
    });
  }

  async addEnemiesDefeated(id: number, enemiesDefeated: number): Promise<CyborNFTEntity> {
    return await this.cyborNftRepository.manager.transaction(async transactionalEntityManager => {
      let toUpdate = await transactionalEntityManager.findOne(CyborNFTEntity, id);
      if (!toUpdate) {
        throw new Error('CyborNFT not found');
      }
      toUpdate.enemies_defeated += enemiesDefeated;
      return await transactionalEntityManager.save(CyborNFTEntity, toUpdate);
    });
  }

  async updateHighestSurvival(id: number, highestSurvival: number): Promise<CyborNFTEntity> {
    return await this.cyborNftRepository.manager.transaction(async transactionalEntityManager => {
      let toUpdate = await transactionalEntityManager.findOne(CyborNFTEntity, id);
      if (!toUpdate) {
        throw new Error('CyborNFT not found');
      }
      toUpdate.highest_survival = highestSurvival;
      return await transactionalEntityManager.save(CyborNFTEntity, toUpdate);
    });
  }

  async updateHighestDefense(id: number, highestDefense: number): Promise<CyborNFTEntity> {
    return await this.cyborNftRepository.manager.transaction(async transactionalEntityManager => {
      let toUpdate = await transactionalEntityManager.findOne(CyborNFTEntity, id);
      if (!toUpdate) {
        throw new Error('CyborNFT not found');
      }
      toUpdate.highest_defense = highestDefense;
      return await transactionalEntityManager.save(CyborNFTEntity, toUpdate);
    });
  }

  async update(id: number, dto: CreateCyborNftDto): Promise<CyborNFTEntity> {
    let toUpdate = await this.cyborNftRepository.findOne(id);
    let updated = Object.assign(toUpdate, dto);

    return await this.cyborNftRepository.save(updated);
  }


  async findOne(cyborNFTID: string, chain: string): Promise<CyborNFTEntity> {
    const qb = await getRepository(CyborNFTEntity)
      .createQueryBuilder('cybor_nft')
      .where('cybor_nft.nft_id = :cyborNFTID AND cybor_nft.chain = :chain', { cyborNFTID: cyborNFTID, chain: chain });

    return await qb.getOne();
  }

  async create(dto: CreateCyborNftDto): Promise<CyborNFTEntity> {
    const qb = await getRepository(CyborNFTEntity)
      .createQueryBuilder('cybor_nft')
      .where('cybor_nft.nft_id = :cyborNFTID AND cybor_nft.chain = :chain', { cyborNFTID: dto.nft_id, chain: dto.chain });

    const _nft = await qb.getOne();
    if (_nft) {
      var _nft_updated = await this.update(_nft.id, dto);
      return _nft_updated;
    }

    const {nft_id: cyborNFTID, chain, state, enemiesDefeated, highestDefense, highestSurvival} = dto;

    let cyborNft = new CyborNFTEntity();
    cyborNft.nft_id = cyborNFTID;
    cyborNft.chain = chain;
    cyborNft.state = state;
    cyborNft.enemies_defeated = enemiesDefeated;
    cyborNft.highest_defense = highestDefense;
    cyborNft.highest_survival = highestSurvival;
    
    const savedCyborNft = await this.cyborNftRepository.save(cyborNft);
    return savedCyborNft;
  }

}
