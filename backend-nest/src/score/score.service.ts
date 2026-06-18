import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScoreEvent } from '../database/score-event.entity';
import type { RequestUser } from '../common/request-user';

@Injectable()
export class ScoreService {
  constructor(
    @InjectRepository(ScoreEvent)
    private readonly scoreRepo: Repository<ScoreEvent>,
  ) {}

  async summaryFor(user: RequestUser) {
    const events = await this.scoreRepo.find({
      where: { userId: user.id },
      order: { createdAt: 'DESC' },
    });
    return {
      total: events.reduce((sum, e) => sum + e.points, 0),
      events: events.map(({ userId: _u, ...e }) => e),
    };
  }
}
