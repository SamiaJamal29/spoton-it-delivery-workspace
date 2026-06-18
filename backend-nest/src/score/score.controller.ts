import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import type { RequestUser } from '../common/request-user';
import { ScoreService } from './score.service';

@UseGuards(JwtAuthGuard)
@Controller('score')
export class ScoreController {
  constructor(private readonly score: ScoreService) {}

  @Get('me')
  me(@CurrentUser() user: RequestUser) {
    return this.score.summaryFor(user);
  }
}
