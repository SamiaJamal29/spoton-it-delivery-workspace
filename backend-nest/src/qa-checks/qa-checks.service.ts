import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QaCheck } from '../database/qa-check.entity';
import { ScoreEvent } from '../database/score-event.entity';
import { CreateQaCheckDto, UpdateQaCheckDto } from './qa-checks.dto';
import type { RequestUser } from '../common/request-user';

@Injectable()
export class QaChecksService {
  constructor(
    @InjectRepository(QaCheck)
    private readonly qaRepo: Repository<QaCheck>,
    @InjectRepository(ScoreEvent)
    private readonly scoreRepo: Repository<ScoreEvent>,
  ) {}

  findByWorkItem(workItemId: string) {
    return this.qaRepo.find({ where: { workItemId }, order: { createdAt: 'ASC' } });
  }

  async findOne(id: string) {
    const check = await this.qaRepo.findOne({ where: { id } });
    if (!check) throw new NotFoundException('QA check not found');
    return check;
  }

  async create(dto: CreateQaCheckDto) {
    const check = this.qaRepo.create(dto);
    return this.qaRepo.save(check);
  }

  async update(id: string, dto: UpdateQaCheckDto, user: RequestUser) {
    const check = await this.findOne(id);
    const wasNotPassed = check.status !== 'passed';
    Object.assign(check, dto);
    const saved = await this.qaRepo.save(check);

    if (dto.status === 'passed' && wasNotPassed) {
      await this.awardScore(user.id, 'complete_qa_check', id, 1);
    }

    return saved;
  }

  async remove(id: string) {
    const check = await this.findOne(id);
    await this.qaRepo.remove(check);
    return { message: 'Deleted' };
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
