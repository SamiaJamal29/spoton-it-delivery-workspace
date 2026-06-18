import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkItem } from '../database/work-item.entity';
import { QaCheck } from '../database/qa-check.entity';
import { Release } from '../database/release.entity';

@Injectable()
export class ItWorkspaceService {
  constructor(
    @InjectRepository(WorkItem)
    private readonly workItemRepo: Repository<WorkItem>,
    @InjectRepository(QaCheck)
    private readonly qaRepo: Repository<QaCheck>,
    @InjectRepository(Release)
    private readonly releaseRepo: Repository<Release>,
  ) {}

  async summary() {
    const [workItems, qaChecks, releases] = await Promise.all([
      this.workItemRepo.count(),
      this.qaRepo.count(),
      this.releaseRepo.count(),
    ]);
    return { counts: { workItems, qaChecks, releases } };
  }

  listWorkItems() {
    return this.workItemRepo.find({ order: { createdAt: 'DESC' }, take: 5 });
  }
}
