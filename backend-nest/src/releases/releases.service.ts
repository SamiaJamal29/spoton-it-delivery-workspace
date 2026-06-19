import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Release } from '../database/release.entity';
import { WorkItem } from '../database/work-item.entity';
import { ScoreEvent } from '../database/score-event.entity';
import { CreateReleaseDto, UpdateReleaseDto } from './releases.dto';
import type { RequestUser } from '../common/request-user';

@Injectable()
export class ReleasesService {
  constructor(
    @InjectRepository(Release)
    private readonly releaseRepo: Repository<Release>,
    @InjectRepository(WorkItem)
    private readonly workItemRepo: Repository<WorkItem>,
    @InjectRepository(ScoreEvent)
    private readonly scoreRepo: Repository<ScoreEvent>,
  ) {}

  findAll(userId: string) {
    return this.releaseRepo.find({ where: { createdBy: userId }, relations: ['workItems'], order: { createdAt: 'DESC' } });
  }

  async findOne(id: string) {
    const release = await this.releaseRepo.findOne({ where: { id }, relations: ['workItems'] });
    if (!release) throw new NotFoundException('Release not found');
    return release;
  }

  async create(dto: CreateReleaseDto, user: RequestUser) {
    const workItems = dto.workItemIds?.length
      ? await this.resolveReadyWorkItems(dto.workItemIds)
      : [];

    const release = this.releaseRepo.create({
      version: dto.version,
      releaseDate: dto.releaseDate,
      summary: dto.summary,
      deploymentStatus: 'draft',
      createdBy: user.id,
      workItems,
    });

    return this.releaseRepo.save(release);
  }

  async update(id: string, dto: UpdateReleaseDto, user: RequestUser) {
    const release = await this.findOne(id);

    if (release.deploymentStatus === 'deployed' && dto.deploymentStatus === 'deployed') {
      throw new BadRequestException('Release is already deployed');
    }

    if (dto.workItemIds !== undefined) {
      release.workItems = dto.workItemIds.length
        ? await this.resolveReadyWorkItems(dto.workItemIds)
        : [];
    }

    if (dto.version !== undefined) release.version = dto.version;
    if (dto.releaseDate !== undefined) release.releaseDate = dto.releaseDate;
    if (dto.summary !== undefined) release.summary = dto.summary;

    if (dto.deploymentStatus !== undefined) {
      release.deploymentStatus = dto.deploymentStatus;

      if (dto.deploymentStatus === 'deployed') {
        await this.markWorkItemsReleased(release.workItems);
        await this.awardScore(user.id, 'deploy_release', id, 3);
      }
    }

    return this.releaseRepo.save(release);
  }

  async remove(id: string) {
    const release = await this.findOne(id);
    await this.releaseRepo.remove(release);
    return { message: 'Deleted' };
  }

  private async resolveReadyWorkItems(ids: string[]) {
    const items = await this.workItemRepo.find({ where: { id: In(ids) } });
    const notReady = items.filter((i) => i.status !== 'ready_for_release');
    if (notReady.length) {
      throw new BadRequestException(
        `Work items must be in "ready_for_release" status: ${notReady.map((i) => i.title).join(', ')}`,
      );
    }
    return items;
  }

  private async markWorkItemsReleased(items: WorkItem[]) {
    for (const item of items) {
      item.status = 'released';
    }
    await this.workItemRepo.save(items);
  }

  private async awardScore(userId: string, action: string, entityId: string, points: number) {
    try {
      const event = this.scoreRepo.create({ userId, action, entityId, points });
      await this.scoreRepo.save(event);
    } catch {
      // duplicate, skip
    }
  }
}
