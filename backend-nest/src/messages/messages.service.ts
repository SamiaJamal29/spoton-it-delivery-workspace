import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Or, Equal } from 'typeorm';
import { Message } from '../database/message.entity';

@Injectable()
export class MessagesService {
  constructor(@InjectRepository(Message) private readonly repo: Repository<Message>) {}

  async send(fromId: string, fromName: string, toId: string, toName: string, content: string) {
    const msg = this.repo.create({ fromId, fromName, toId, toName, content });
    return this.repo.save(msg);
  }

  // All messages between two users, oldest first
  async getConversation(userId: string, otherId: string) {
    return this.repo.find({
      where: [
        { fromId: userId, toId: otherId },
        { fromId: otherId, toId: userId },
      ],
      order: { createdAt: 'ASC' },
    });
  }

  // Latest message per unique conversation partner for a user
  async getThreads(userId: string) {
    const msgs = await this.repo.find({
      where: [{ fromId: userId }, { toId: userId }],
      order: { createdAt: 'DESC' },
    });

    const seen = new Set<string>();
    const threads: { partnerId: string; partnerName: string; lastMessage: Message; unread: number }[] = [];

    for (const m of msgs) {
      const partnerId   = m.fromId === userId ? m.toId   : m.fromId;
      const partnerName = m.fromId === userId ? m.toName : m.fromName;
      if (seen.has(partnerId)) continue;
      seen.add(partnerId);
      const unread = msgs.filter(x => x.fromId === partnerId && x.toId === userId && !x.read).length;
      threads.push({ partnerId, partnerName, lastMessage: m, unread });
    }
    return threads;
  }

  async markRead(toId: string, fromId: string) {
    await this.repo.update({ fromId, toId, read: false }, { read: true });
  }

  async unreadCount(userId: string) {
    return this.repo.count({ where: { toId: userId, read: false } });
  }
}
