import { Controller, Post, Get, Body, UseGuards, Req } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { NftService } from './nft.service';
import { MintNftDto } from './dto/mint-nft.dto';

@ApiTags('nft')
@ApiBearerAuth('access-token')
@Controller('nft')
@UseGuards(JwtAuthGuard)
@ApiResponse({ status: 401, description: 'Unauthenticated' })
export class NftController {
  constructor(private readonly nftService: NftService) {}

  @Post('mint')
  @ApiOperation({ summary: 'Mint an NFT for a previously unlocked achievement' })
  @ApiBody({ type: MintNftDto })
  @ApiResponse({ status: 201, description: 'NFT minted — returns mint record with txHash and chain' })
  @ApiResponse({ status: 400, description: 'Achievement not unlocked or NFT already minted for this achievement' })
  @ApiResponse({ status: 404, description: 'Achievement not found' })
  async mint(@Req() req: any, @Body() dto: MintNftDto) {
    const userId = req.user.id;
    return this.nftService.mintNFT(userId, dto.achievementId);
  }

  @Get('me')
  @ApiOperation({ summary: "List all NFTs minted for the authenticated user" })
  @ApiResponse({ status: 200, description: 'Array of NFT mint records for the user' })
  async getMyNFTs(@Req() req: any) {
    const userId = req.user.id;
    return this.nftService.getUserNFTs(userId);
  }
}
