import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import type { RequestUser } from '../common/request-user';
import { MessagesService } from './messages.service';

@UseGuards(JwtAuthGuard)
@Controller('messages')
export class MessagesController {
  constructor(private readonly svc: MessagesService) {}

  @Get('threads')
  threads(@CurrentUser() user: RequestUser) {
    return this.svc.getThreads(user.id);
  }

  @Get('unread')
  unread(@CurrentUser() user: RequestUser) {
    return this.svc.unreadCount(user.id);
  }

  @Get('conversation/:otherId')
  async conversation(@Param('otherId') otherId: string, @CurrentUser() user: RequestUser) {
    await this.svc.markRead(user.id, otherId);
    return this.svc.getConversation(user.id, otherId);
  }

  @Post()
  send(@Body() body: { toId: string; toName: string; content: string }, @CurrentUser() user: RequestUser) {
    return this.svc.send(user.id, user.name, body.toId, body.toName, body.content);
  }
}
