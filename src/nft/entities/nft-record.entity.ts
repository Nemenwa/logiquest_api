import { ApiProperty } from '@nestjs/swagger';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('nft_records')
@Index(['userId', 'achievementId'], { unique: true })
export class NFTRecord {
  @ApiProperty({ example: 'uuid-nft-id', description: 'NFT record UUID' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ example: 'logiquest-mint-0001', description: 'Unique mint identifier assigned at minting time' })
  @Column({ unique: true })
  mintId!: string;

  @ApiProperty({ example: 'uuid-user-id', description: 'UUID of the user who owns this NFT' })
  @Column()
  userId!: string;

  @ApiProperty({ example: 'uuid-achievement-id', description: 'UUID of the achievement this NFT represents' })
  @Column()
  achievementId!: string;

  @ApiProperty({ example: '0xabc123...', description: 'On-chain transaction hash from the mint operation' })
  @Column()
  txHash!: string;

  @ApiProperty({ example: 'polygon', description: 'Blockchain network the NFT was minted on' })
  @Column()
  chain!: string;

  @ApiProperty({ example: '2024-07-01T14:30:00.000Z', description: 'Timestamp when the NFT was minted' })
  @CreateDateColumn()
  mintedAt!: Date;
}
