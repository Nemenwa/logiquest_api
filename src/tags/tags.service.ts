import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tag } from './entities/tag.entity';
import { CreateTagDto } from './dto/create-tag.dto';

@Injectable()
export class TagsService {
  constructor(
    @InjectRepository(Tag)
    private readonly tagRepository: Repository<Tag>,
  ) {}

  private slugify(text: string): string {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-');
  }

  async create(dto: CreateTagDto): Promise<Tag> {
    const slug = this.slugify(dto.name);
    const existing = await this.tagRepository.findOne({ where: { slug } });
    if (existing) {
      throw new ConflictException(`Tag with slug "${slug}" already exists`);
    }

    const tag = this.tagRepository.create({ name: dto.name, slug });
    return this.tagRepository.save(tag);
  }

  async findAllWithPuzzleCount(): Promise<any[]> {
    const tags = await this.tagRepository.find({
      relations: { puzzles: true },
    });

    return tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      createdAt: tag.createdAt,
      puzzleCount: tag.puzzles ? tag.puzzles.length : 0,
    }));
  }
}
