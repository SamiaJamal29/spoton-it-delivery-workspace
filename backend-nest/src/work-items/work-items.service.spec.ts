import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WorkItemsService } from './work-items.service';

const mockUser = { id: 'user-1', name: 'Test User', email: 'test@test.com', role: 'Member' };

function makeItem(overrides = {}) {
  return { id: 'item-1', title: 'Test', status: 'backlog', qaChecks: [], ...overrides };
}

function makeService(itemOverrides = {}, qaChecks: any[] = []) {
  const item = makeItem({ ...itemOverrides, qaChecks });
  const workItemRepo = {
    findOne: jest.fn().mockResolvedValue(item),
    save: jest.fn().mockImplementation(async (i) => i),
    create: jest.fn().mockImplementation((dto) => dto),
    remove: jest.fn().mockResolvedValue(undefined),
  };
  const scoreRepo = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest.fn().mockResolvedValue({}),
  };
  const svc = new WorkItemsService(workItemRepo as any, scoreRepo as any);
  return { svc, workItemRepo };
}

describe('WorkItemsService — transition guard', () => {
  it('rejects an invalid transition (backlog → qa)', async () => {
    const { svc } = makeService({ status: 'backlog' });
    await expect(svc.update('item-1', { status: 'qa' }, mockUser))
      .rejects.toThrow(BadRequestException);
  });

  it('allows a valid transition (backlog → planned)', async () => {
    const { svc } = makeService({ status: 'backlog' });
    await expect(svc.update('item-1', { status: 'planned' }, mockUser))
      .resolves.toBeDefined();
  });

  it('blocks ready_for_release when there are zero QA checks', async () => {
    const { svc } = makeService({ status: 'qa' }, []);
    await expect(svc.update('item-1', { status: 'ready_for_release' }, mockUser))
      .rejects.toThrow('at least one QA check');
  });

  it('blocks ready_for_release when a QA check is not passed', async () => {
    const { svc } = makeService({ status: 'qa' }, [
      { id: 'qa-1', status: 'pending' },
      { id: 'qa-2', status: 'passed' },
    ]);
    await expect(svc.update('item-1', { status: 'ready_for_release' }, mockUser))
      .rejects.toThrow('1 QA check(s) are not passed yet');
  });

  it('allows ready_for_release when all QA checks passed', async () => {
    const { svc } = makeService({ status: 'qa' }, [
      { id: 'qa-1', status: 'passed' },
      { id: 'qa-2', status: 'passed' },
    ]);
    await expect(svc.update('item-1', { status: 'ready_for_release' }, mockUser))
      .resolves.toBeDefined();
  });

  it('rejects a status of "banana" (invalid enum via transition map)', async () => {
    const { svc } = makeService({ status: 'backlog' });
    await expect(svc.update('item-1', { status: 'banana' as any }, mockUser))
      .rejects.toThrow(BadRequestException);
  });

  it('throws NotFoundException for unknown id', async () => {
    const { svc, workItemRepo } = makeService();
    workItemRepo.findOne.mockResolvedValue(null);
    await expect(svc.update('no-such-id', { status: 'planned' }, mockUser))
      .rejects.toThrow(NotFoundException);
  });
});
