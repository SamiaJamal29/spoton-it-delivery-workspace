import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import type { RequestUser } from '../common/request-user';
import { QaChecksService } from './qa-checks.service';
import { CreateQaCheckDto, UpdateQaCheckDto } from './qa-checks.dto';

@UseGuards(JwtAuthGuard)
@Controller('qa-checks')
export class QaChecksController {
  constructor(private readonly service: QaChecksService) {}

  @Get('work-item/:workItemId')
  findByWorkItem(@Param('workItemId') workItemId: string) {
    return this.service.findByWorkItem(workItemId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateQaCheckDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateQaCheckDto, @CurrentUser() user: RequestUser) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
