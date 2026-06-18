import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkItem, WorkItemStatus } from '../database/work-item.entity';
import { ScoreEvent } from '../database/score-event.entity';
import { CreateWorkItemDto, UpdateWorkItemDto } from './work-items.dto';
import type { RequestUser } from '../common/request-user';

const VALID_TRANSITIONS: Record<WorkItemStatus, WorkItemStatus[]> = {
  backlog: ['planned'],
  planned: ['in_progress', 'backlog'],
  in_progress: ['qa', 'planned'],
  qa: ['ready_for_release', 'in_progress'],
  ready_for_release: ['qa', 'released'],
  released: [],
};

const SCORE_ACTIONS: Partial<Record<WorkItemStatus, { action: string; points: number }>> = {
  qa: { action: 'move_to_qa', points: 1 },
  ready_for_release: { action: 'move_to_ready', points: 2 },
};

@Injectable()
export class WorkItemsService {
  constructor(
    @InjectRepository(WorkItem)
    private readonly workItemRepo: Repository<WorkItem>,
    @InjectRepository(ScoreEvent)
    private readonly scoreRepo: Repository<ScoreEvent>,
  ) {}

  async findAll(filters: { status?: string; priority?: string; assignee?: string; search?: string; myWork?: string; userId?: string }) {
    const qb = this.workItemRepo.createQueryBuilder('wi').leftJoinAndSelect('wi.qaChecks', 'qa');

    if (filters.status) qb.andWhere('wi.status = :status', { status: filters.status });
    if (filters.priority) qb.andWhere('wi.priority = :priority', { priority: filters.priority });
    if (filters.assignee) qb.andWhere('wi.assignee ILIKE :assignee', { assignee: `%${filters.assignee}%` });
    if (filters.search) qb.andWhere('(wi.title ILIKE :s OR wi.description ILIKE :s)', { s: `%${filters.search}%` });
    if (filters.myWork === 'true' && filters.userId) qb.andWhere('wi.createdBy = :uid', { uid: filters.userId });

    return qb.orderBy('wi.createdAt', 'DESC').getMany();
  }

  async findOne(id: string) {
    const item = await this.workItemRepo.findOne({ where: { id }, relations: ['qaChecks'] });
    if (!item) throw new NotFoundException('Work item not found');
    return item;
  }

  async create(dto: CreateWorkItemDto, user: RequestUser) {
    const item = this.workItemRepo.create({
      ...dto,
      status: 'backlog',
      createdBy: user.id,
    });
    const saved = await this.workItemRepo.save(item);
    await this.awardScore(user.id, 'create_work_item', saved.id, 1);
    return saved;
  }

  async update(id: string, dto: UpdateWorkItemDto, user: RequestUser) {
    const item = await this.findOne(id);

    if (dto.status && dto.status !== item.status) {
      const allowed = VALID_TRANSITIONS[item.status];
      if (!allowed.includes(dto.status)) {
        throw new BadRequestException(
          `Cannot move from "${item.status}" to "${dto.status}". Allowed: ${allowed.join(', ') || 'none'}`,
        );
      }

      if (dto.status === 'ready_for_release') {
        await this.assertQaReady(item);
      }

      const scoreConfig = SCORE_ACTIONS[dto.status];
      if (scoreConfig) {
        await this.awardScore(user.id, scoreConfig.action, id, scoreConfig.points);
      }
    }

    Object.assign(item, dto);
    return this.workItemRepo.save(item);
  }

  async remove(id: string) {
    const item = await this.findOne(id);
    await this.workItemRepo.remove(item);
    return { message: 'Deleted' };
  }

  private async assertQaReady(item: WorkItem) {
    const full = await this.workItemRepo.findOne({ where: { id: item.id }, relations: ['qaChecks'] });
    if (!full || !full.qaChecks.length) {
      throw new BadRequestException('Work item must have at least one QA check before moving to ready_for_release');
    }
    const notPassed = full.qaChecks.filter((q) => q.status !== 'passed');
    if (notPassed.length) {
      throw new BadRequestException(`${notPassed.length} QA check(s) are not passed yet`);
    }
  }

  private async awardScore(userId: string, action: string, entityId: string, points: number) {
    try {
      const event = this.scoreRepo.create({ userId, action, entityId, points });
      await this.scoreRepo.save(event);
    } catch {
      // unique constraint violation = duplicate, silently skip
    }
  }
}
